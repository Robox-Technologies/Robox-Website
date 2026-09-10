import { loadPyodide, type PyodideInterface } from 'pyodide'

export type LintRequest = {
    id: number
    code: string
}

export type LintDiagnostic = {
    startLine: number
    startColumn: number
    endLine: number
    endColumn: number
    message: string
}

export type LintResponse = {
    id: number
    diagnostics: LintDiagnostic[]
}

// Defined once per worker so linting a keystroke only calls into already-
// compiled Python functions instead of recompiling this source every time.
const LINT_SETUP = `
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

def __check_calls(tree):
    errors = []
    user_functions = __user_functions(tree)
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Name):
            continue
        name = node.func.id
        signature = None
        if name in user_functions:
            try:
                signature = __signature_from_def(user_functions[name])
            except Exception:
                continue
        elif hasattr(builtins, name):
            try:
                signature = inspect.signature(getattr(builtins, name))
            except (TypeError, ValueError):
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
        }])
    return json.dumps(__check_calls(tree))
`

let pyodidePromise: Promise<PyodideInterface> | null = null

function getPyodide(): Promise<PyodideInterface> {
    pyodidePromise ??= loadPyodide({ indexURL: '/hub/pyodide/' }).then((pyodide) => {
        pyodide.runPython(LINT_SETUP)
        return pyodide
    })
    return pyodidePromise
}

self.onmessage = async (event: MessageEvent<LintRequest>) => {
    const { id, code } = event.data
    try {
        const pyodide = await getPyodide()
        const lint = pyodide.globals.get('__lint') as (source: string) => string
        const diagnostics = JSON.parse(lint(code)) as LintDiagnostic[]
        self.postMessage({ id, diagnostics } satisfies LintResponse)
    } catch (error) {
        console.error('Pyodide lint failed', error)
        self.postMessage({ id, diagnostics: [] } satisfies LintResponse)
    }
}
