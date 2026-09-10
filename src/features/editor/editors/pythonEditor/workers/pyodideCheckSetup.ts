// Shared between the live-linting worker (pyodideLint.worker.ts) and the
// roboxlib-compatibility test (src/features/editor/__tests__/), so both
// check calls against the exact same Python signature logic instead of two
// copies drifting apart.

export type LintDiagnostic = {
    startLine: number
    startColumn: number
    endLine: number
    endColumn: number
    message: string
    // "syntax": ast.parse itself failed -- for the compatibility sweep, this
    // usually means a generically-mocked field produced unparseable code
    // (e.g. a placeholder standing in for a comparison operator), not a real
    // mismatch against roboxlib. "semantic": everything __check_calls finds.
    kind: 'syntax' | 'semantic'
}

// roboxlib.py is real MicroPython source (imports `machine`/`utime`, calls
// the MicroPython-only `const()` builtin), so it can't just be imported
// under Pyodide's CPython as-is. None of these are called at import time
// (only from inside method bodies, which never run just by importing), so
// no-op stand-ins are enough to let `import roboxlib` succeed and get real
// signatures out of `inspect` -- nothing here needs to actually work.
export const HARDWARE_STUBS = `
import sys
import types
import builtins

def __make_stub_module(name, **attrs):
    module = types.ModuleType(name)
    for key, value in attrs.items():
        setattr(module, key, value)
    sys.modules[name] = module

class __StubPin:
    OUT = 0
    IN = 1
    def __init__(self, *args, **kwargs): pass
    def value(self, *args, **kwargs): pass

class __StubPWM:
    def __init__(self, *args, **kwargs): pass
    def freq(self, *args, **kwargs): pass
    def duty_u16(self, *args, **kwargs): pass

class __StubI2C:
    def __init__(self, *args, **kwargs): pass
    def readfrom_mem(self, *args, **kwargs): return b""
    def writeto_mem(self, *args, **kwargs): pass

__make_stub_module(
    "machine",
    Pin=__StubPin,
    PWM=__StubPWM,
    I2C=__StubI2C,
    time_pulse_us=lambda *a, **k: 0,
)
__make_stub_module(
    "utime",
    sleep=lambda *a, **k: None,
    sleep_us=lambda *a, **k: None,
    ticks_diff=lambda *a, **k: 0,
    ticks_ms=lambda *a, **k: 0,
)
__make_stub_module(
    "ustruct",
    pack=lambda *a, **k: b"",
    unpack=lambda *a, **k: (0,),
)
builtins.const = lambda x: x
`

// Free functions checked against builtins/user defs; method calls (e.g.
// motors.run_motors(...)) checked against roboxlib's real classes, mapped
// from the fixed instance names the preamble always creates (see
// src/features/editor/config/preamble.ts's base \`preamble\` string --
// extension-only instances like \`servo\` aren't included, since whether
// they exist depends on per-project state the linter doesn't have).
export const ROBOXLIB_SETUP = `
try:
    import roboxlib
    __INSTANCE_CLASSES = {
        "motors": roboxlib.Motors,
        "line": roboxlib.LineSensors,
        "ultrasonic": roboxlib.UltrasonicSensor,
        "color_sensor": roboxlib.ColorSensor,
    }
    # Constructor calls, e.g. UltrasonicSensor(trigger_pin=4) -- a plain
    # Name call, not a method call, so it needs its own signature source
    # (roboxlib's own classes, keyed by their own names).
    __CLASS_CONSTRUCTORS = {
        "Motors": roboxlib.Motors,
        "LineSensors": roboxlib.LineSensors,
        "UltrasonicSensor": roboxlib.UltrasonicSensor,
        "ColorSensor": roboxlib.ColorSensor,
        "Servo": roboxlib.Servo,
    }
except Exception as __roboxlib_import_error:
    print("roboxlib import failed, method calls won't be checked:", __roboxlib_import_error)
    __INSTANCE_CLASSES = {}
    __CLASS_CONSTRUCTORS = {}
`

// Defined once per worker so linting a keystroke only calls into already-
// compiled Python functions instead of recompiling this source every time.
export const LINT_SETUP = `
import ast
import builtins
import inspect
import json

def __error(node, message):
    line = node.lineno
    col = node.col_offset + 1
    return {
        "startLine": line,
        "startColumn": col,
        "endLine": getattr(node, "end_lineno", None) or line,
        "endColumn": (getattr(node, "end_col_offset", None) or node.col_offset) + 1,
        "message": message,
        # "semantic": a real signature/attribute mismatch against roboxlib.
        # Set to "syntax" only in __lint's SyntaxError branch below.
        "kind": "semantic",
    }

def __signature_from_def(node):
    # Built from the def line only -- the body never runs.
    params = []
    args = node.args
    for a in args.posonlyargs:
        params.append(inspect.Parameter(a.arg, inspect.Parameter.POSITIONAL_ONLY))
    num_defaults = len(args.defaults)
    for i, a in enumerate(args.args):
        has_default = i >= len(args.args) - num_defaults
        default = None if has_default else inspect.Parameter.empty
        params.append(inspect.Parameter(a.arg, inspect.Parameter.POSITIONAL_OR_KEYWORD, default=default))
    if args.vararg:
        params.append(inspect.Parameter(args.vararg.arg, inspect.Parameter.VAR_POSITIONAL))
    for i, a in enumerate(args.kwonlyargs):
        default = inspect.Parameter.empty if args.kw_defaults[i] is None else None
        params.append(inspect.Parameter(a.arg, inspect.Parameter.KEYWORD_ONLY, default=default))
    if args.kwarg:
        params.append(inspect.Parameter(args.kwarg.arg, inspect.Parameter.VAR_KEYWORD))
    return inspect.Signature(params)

def __user_functions(tree):
    # Skips methods (def inside a class) -- a bare "name(...)" call can't
    # reach those, so checking them against a plain call is a false positive.
    method_ids = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            for child in node.body:
                if isinstance(child, ast.FunctionDef):
                    method_ids.add(id(child))
    functions = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and id(node) not in method_ids:
            functions[node.name] = node
    return functions

def __method_signature(node, errors):
    # motors.run_motors(...) etc. -- checked against roboxlib's real class,
    # via the fixed instance-name -> class mapping in __INSTANCE_CLASSES.
    instance_name = node.func.value.id
    if instance_name not in __INSTANCE_CLASSES:
        return None
    cls = __INSTANCE_CLASSES[instance_name]
    method_name = node.func.attr
    method = getattr(cls, method_name, None)
    if method is None:
        errors.append(__error(
            node,
            "'{}' object has no attribute '{}'".format(cls.__name__, method_name),
        ))
        return None
    try:
        full_signature = inspect.signature(method)
    except (TypeError, ValueError):
        return None
    # Drop \`self\` -- the call site never supplies it.
    return inspect.Signature(list(full_signature.parameters.values())[1:])

def __check_calls(tree):
    errors = []
    user_functions = __user_functions(tree)
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue

        signature = None
        if isinstance(node.func, ast.Name):
            name = node.func.id
            if name in user_functions:
                try:
                    signature = __signature_from_def(user_functions[name])
                except Exception:
                    continue
            elif name in __CLASS_CONSTRUCTORS:
                try:
                    full_signature = inspect.signature(__CLASS_CONSTRUCTORS[name].__init__)
                except (TypeError, ValueError):
                    continue
                # Drop \`self\` -- the call site never supplies it.
                signature = inspect.Signature(list(full_signature.parameters.values())[1:])
            elif hasattr(builtins, name):
                try:
                    signature = inspect.signature(getattr(builtins, name))
                except (TypeError, ValueError):
                    continue
            else:
                continue
        elif isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name):
            signature = __method_signature(node, errors)
            if signature is None:
                continue
        else:
            continue

        if any(isinstance(a, ast.Starred) for a in node.args):
            continue
        keywords = {}
        skip = False
        for kw in node.keywords:
            if kw.arg is None:
                skip = True
                break
            keywords[kw.arg] = None
        if skip:
            continue

        try:
            signature.bind(*([None] * len(node.args)), **keywords)
        except TypeError as e:
            errors.append(__error(node, str(e)))
    return errors

def __lint(source):
    try:
        tree = ast.parse(source, "<student>", "exec")
    except SyntaxError as e:
        line = e.lineno or 1
        col = e.offset or 1
        return json.dumps([{
            "startLine": line,
            "startColumn": col,
            "endLine": e.end_lineno or line,
            "endColumn": max((e.end_offset or col) , col + 1),
            "message": e.msg,
            "kind": "syntax",
        }])
    return json.dumps(__check_calls(tree))
`
