import{g as Ue}from"./_commonjsHelpers.Cpj98o6Y.js";import{r as Ve}from"./blockly_compressed.Dnh9KwAa.js";var h={exports:{}},Pe=h.exports,V;function Be(){return V||(V=1,(function(P,we){(function(R,l){P.exports=l(Ve())})(Pe,function(R){var l=R.__namespace__,B=function(e,t){return["[]",o.ATOMIC]},b=function(e,t){const r=Array(e.itemCount_);for(let n=0;n<e.itemCount_;n++)r[n]=t.valueToCode(e,"ADD"+n,o.NONE)||"None";return["["+r.join(", ")+"]",o.ATOMIC]},k=function(e,t){const r=t.valueToCode(e,"ITEM",o.NONE)||"None";return e=t.valueToCode(e,"NUM",o.MULTIPLICATIVE)||"0",["["+r+"] * "+e,o.MULTIPLICATIVE]},w=function(e,t){return["len("+(t.valueToCode(e,"VALUE",o.NONE)||"[]")+")",o.FUNCTION_CALL]},G=function(e,t){return["not len("+(t.valueToCode(e,"VALUE",o.NONE)||"[]")+")",o.LOGICAL_NOT]},j=function(e,t){const r=t.valueToCode(e,"FIND",o.NONE)||"[]",n=t.valueToCode(e,"VALUE",o.NONE)||"''";let i=" -1",s="",$=" - 1";return e.workspace.options.oneBasedIndex&&(i=" 0",s=" + 1",$=""),[(e.getFieldValue("END")==="FIRST"?t.provideFunction_("first_index",`
def ${t.FUNCTION_NAME_PLACEHOLDER_}(my_list, elem):
  try: index = my_list.index(elem)${s}
  except: index =${i}
  return index
`):t.provideFunction_("last_index",`
def ${t.FUNCTION_NAME_PLACEHOLDER_}(my_list, elem):
  try: index = len(my_list) - my_list[::-1].index(elem)${$}
  except: index =${i}
  return index
`))+"("+n+", "+r+")",o.FUNCTION_CALL]},W=function(e,t){const r=e.getFieldValue("MODE")||"GET",n=e.getFieldValue("WHERE")||"FROM_START";var i=t.valueToCode(e,"VALUE",n==="RANDOM"?o.NONE:o.MEMBER)||"[]";switch(n){case"FIRST":if(r==="GET")return[i+"[0]",o.MEMBER];if(r==="GET_REMOVE")return[i+".pop(0)",o.FUNCTION_CALL];if(r==="REMOVE")return i+`.pop(0)
`;break;case"LAST":if(r==="GET")return[i+"[-1]",o.MEMBER];if(r==="GET_REMOVE")return[i+".pop()",o.FUNCTION_CALL];if(r==="REMOVE")return i+`.pop()
`;break;case"FROM_START":if(e=t.getAdjustedInt(e,"AT"),r==="GET")return[i+"["+e+"]",o.MEMBER];if(r==="GET_REMOVE")return[i+".pop("+e+")",o.FUNCTION_CALL];if(r==="REMOVE")return i+".pop("+e+`)
`;break;case"FROM_END":if(e=t.getAdjustedInt(e,"AT",1,!0),r==="GET")return[i+"["+e+"]",o.MEMBER];if(r==="GET_REMOVE")return[i+".pop("+e+")",o.FUNCTION_CALL];if(r==="REMOVE")return i+".pop("+e+`)
`;break;case"RANDOM":if(t.definitions_.import_random="import random",r==="GET")return["random.choice("+i+")",o.FUNCTION_CALL];if(i=t.provideFunction_("lists_remove_random_item",`
def ${t.FUNCTION_NAME_PLACEHOLDER_}(myList):
  x = int(random.random() * len(myList))
  return myList.pop(x)
`)+"("+i+")",r==="GET_REMOVE")return[i,o.FUNCTION_CALL];if(r==="REMOVE")return i+`
`}throw Error("Unhandled combination (lists_getIndex).")},X=function(e,t){let r=t.valueToCode(e,"LIST",o.MEMBER)||"[]";const n=e.getFieldValue("MODE")||"GET";var i=e.getFieldValue("WHERE")||"FROM_START";const s=t.valueToCode(e,"TO",o.NONE)||"None";switch(i){case"FIRST":if(n==="SET")return r+"[0] = "+s+`
`;if(n==="INSERT")return r+".insert(0, "+s+`)
`;break;case"LAST":if(n==="SET")return r+"[-1] = "+s+`
`;if(n==="INSERT")return r+".append("+s+`)
`;break;case"FROM_START":if(t=t.getAdjustedInt(e,"AT"),n==="SET")return r+"["+t+"] = "+s+`
`;if(n==="INSERT")return r+".insert("+t+", "+s+`)
`;break;case"FROM_END":if(t=t.getAdjustedInt(e,"AT",1,!0),n==="SET")return r+"["+t+"] = "+s+`
`;if(n==="INSERT")return r+".insert("+t+", "+s+`)
`;break;case"RANDOM":if(t.definitions_.import_random="import random",r.match(/^\w+$/)?e="":(e=t.nameDB_.getDistinctName("tmp_list",l.NameType$$module$build$src$core$names.VARIABLE),i=e+" = "+r+`
`,r=e,e=i),t=t.nameDB_.getDistinctName("tmp_x",l.NameType$$module$build$src$core$names.VARIABLE),e+=t+" = int(random.random() * len("+r+`))
`,n==="SET")return e+(r+"["+t+"] = "+s+`
`);if(n==="INSERT")return e+(r+".insert("+t+", "+s+`)
`)}throw Error("Unhandled combination (lists_setIndex).")},H=function(e,t){const r=t.valueToCode(e,"LIST",o.MEMBER)||"[]";var n=e.getFieldValue("WHERE1");const i=e.getFieldValue("WHERE2");switch(n){case"FROM_START":n=t.getAdjustedInt(e,"AT1"),n===0&&(n="");break;case"FROM_END":n=t.getAdjustedInt(e,"AT1",1,!0);break;case"FIRST":n="";break;default:throw Error("Unhandled option (lists_getSublist)")}switch(i){case"FROM_START":e=t.getAdjustedInt(e,"AT2",1);break;case"FROM_END":e=t.getAdjustedInt(e,"AT2",0,!0),l.isNumber$$module$build$src$core$utils$string(String(e))?e===0&&(e=""):(t.definitions_.import_sys="import sys",e+=" or sys.maxsize");break;case"LAST":e="";break;default:throw Error("Unhandled option (lists_getSublist)")}return[r+"["+n+" : "+e+"]",o.MEMBER]},q=function(e,t){const r=t.valueToCode(e,"LIST",o.NONE)||"[]",n=e.getFieldValue("TYPE");return e=e.getFieldValue("DIRECTION")==="1"?"False":"True",[t.provideFunction_("lists_sort",`
def ${t.FUNCTION_NAME_PLACEHOLDER_}(my_list, type, reverse):
  def try_float(s):
    try:
      return float(s)
    except:
      return 0
  key_funcs = {
    "NUMERIC": try_float,
    "TEXT": str,
    "IGNORE_CASE": lambda s: str(s).lower()
  }
  key_func = key_funcs[type]
  list_cpy = list(my_list)
  return sorted(list_cpy, key=key_func, reverse=reverse)
`)+"("+r+', "'+n+'", '+e+")",o.FUNCTION_CALL]},Y=function(e,t){var r=e.getFieldValue("MODE");if(r==="SPLIT")r=t.valueToCode(e,"INPUT",o.MEMBER)||"''",e=t.valueToCode(e,"DELIM",o.NONE),e=r+".split("+e+")";else if(r==="JOIN")r=t.valueToCode(e,"INPUT",o.NONE)||"[]",e=(t.valueToCode(e,"DELIM",o.MEMBER)||"''")+".join("+r+")";else throw Error("Unknown mode: "+r);return[e,o.FUNCTION_CALL]},z=function(e,t){return["list(reversed("+(t.valueToCode(e,"LIST",o.NONE)||"[]")+"))",o.FUNCTION_CALL]},M=function(e,t){let r=0,n="",i,s;t.STATEMENT_PREFIX&&(n+=t.injectId(t.STATEMENT_PREFIX,e));do s=t.valueToCode(e,"IF"+r,o.NONE)||"False",i=t.statementToCode(e,"DO"+r)||t.PASS,t.STATEMENT_SUFFIX&&(i=t.prefixLines(t.injectId(t.STATEMENT_SUFFIX,e),t.INDENT)+i),n+=(r===0?"if ":"elif ")+s+`:
`+i,r++;while(e.getInput("IF"+r));return(e.getInput("ELSE")||t.STATEMENT_SUFFIX)&&(i=e.getInput("ELSE")&&t.statementToCode(e,"ELSE")||t.PASS,t.STATEMENT_SUFFIX&&(i=t.prefixLines(t.injectId(t.STATEMENT_SUFFIX,e),t.INDENT)+i),n+=`else:
`+i),n},K=function(e,t){const r={EQ:"==",NEQ:"!=",LT:"<",LTE:"<=",GT:">",GTE:">="}[e.getFieldValue("OP")],n=o.RELATIONAL,i=t.valueToCode(e,"A",n)||"0";return e=t.valueToCode(e,"B",n)||"0",[i+" "+r+" "+e,n]},Q=function(e,t){const r=e.getFieldValue("OP")==="AND"?"and":"or",n=r==="and"?o.LOGICAL_AND:o.LOGICAL_OR;let i=t.valueToCode(e,"A",n);return e=t.valueToCode(e,"B",n),i||e?(t=r==="and"?"True":"False",i||(i=t),e||(e=t)):e=i="False",[i+" "+r+" "+e,n]},J=function(e,t){return["not "+(t.valueToCode(e,"BOOL",o.LOGICAL_NOT)||"True"),o.LOGICAL_NOT]},Z=function(e,t){return[e.getFieldValue("BOOL")==="TRUE"?"True":"False",o.ATOMIC]},ee=function(e,t){return["None",o.ATOMIC]},te=function(e,t){const r=t.valueToCode(e,"IF",o.CONDITIONAL)||"False",n=t.valueToCode(e,"THEN",o.CONDITIONAL)||"None";return e=t.valueToCode(e,"ELSE",o.CONDITIONAL)||"None",[n+" if "+r+" else "+e,o.CONDITIONAL]},F=function(e,t){let r;r=e.getField("TIMES")?String(parseInt(e.getFieldValue("TIMES"),10)):t.valueToCode(e,"TIMES",o.NONE)||"0",r=l.isNumber$$module$build$src$core$utils$string(r)?parseInt(r,10):"int("+r+")";let n=t.statementToCode(e,"DO");return n=t.addLoopTrap(n,e)||t.PASS,"for "+t.nameDB_.getDistinctName("count",l.NameType$$module$build$src$core$names.VARIABLE)+" in range("+r+`):
`+n},re=function(e,t){const r=e.getFieldValue("MODE")==="UNTIL";let n=t.valueToCode(e,"BOOL",r?o.LOGICAL_NOT:o.NONE)||"False",i=t.statementToCode(e,"DO");return i=t.addLoopTrap(i,e)||t.PASS,r&&(n="not "+n),"while "+n+`:
`+i},oe=function(e,t){const r=t.getVariableName(e.getFieldValue("VAR"));var n=t.valueToCode(e,"FROM",o.NONE)||"0",i=t.valueToCode(e,"TO",o.NONE)||"0",s=t.valueToCode(e,"BY",o.NONE)||"1";let $=t.statementToCode(e,"DO");$=t.addLoopTrap($,e)||t.PASS;let m="";e=function(){return t.provideFunction_("upRange",`
def ${t.FUNCTION_NAME_PLACEHOLDER_}(start, stop, step):
  while start <= stop:
    yield start
    start += abs(step)
`)};const p=function(){return t.provideFunction_("downRange",`
def ${t.FUNCTION_NAME_PLACEHOLDER_}(start, stop, step):
  while start >= stop:
    yield start
    start -= abs(step)
`)};if(l.isNumber$$module$build$src$core$utils$string(n)&&l.isNumber$$module$build$src$core$utils$string(i)&&l.isNumber$$module$build$src$core$utils$string(s))n=Number(n),i=Number(i),s=Math.abs(Number(s)),n%1===0&&i%1===0&&s%1===0?(n<=i?(i++,e=n===0&&s===1?i:n+", "+i,s!==1&&(e+=", "+s)):(i--,e=n+", "+i+", -"+s),e="range("+e+")"):(e=n<i?e():p(),e+="("+n+", "+i+", "+s+")");else{const I=function(a,_){return l.isNumber$$module$build$src$core$utils$string(a)?a=String(Number(a)):a.match(/^\w+$/)||(_=t.nameDB_.getDistinctName(r+_,l.NameType$$module$build$src$core$names.VARIABLE),m+=_+" = "+a+`
`,a=_),a};n=I(n,"_start"),i=I(i,"_end"),s=I(s,"_inc"),typeof n=="number"&&typeof i=="number"?(e=n<i?e():p(),e+="("+n+", "+i+", "+s+")"):e="("+n+" <= "+i+") and "+e()+"("+n+", "+i+", "+s+") or "+p()+"("+n+", "+i+", "+s+")"}return m+="for "+r+" in "+e+`:
`+$},ne=function(e,t){const r=t.getVariableName(e.getFieldValue("VAR")),n=t.valueToCode(e,"LIST",o.RELATIONAL)||"[]";let i=t.statementToCode(e,"DO");return i=t.addLoopTrap(i,e)||t.PASS,"for "+r+" in "+n+`:
`+i},ie=function(e,t){let r="";if(t.STATEMENT_PREFIX&&(r+=t.injectId(t.STATEMENT_PREFIX,e)),t.STATEMENT_SUFFIX&&(r+=t.injectId(t.STATEMENT_SUFFIX,e)),t.STATEMENT_PREFIX){const n=e.getSurroundLoop();n&&!n.suppressPrefixSuffix&&(r+=t.injectId(t.STATEMENT_PREFIX,n))}switch(e.getFieldValue("FLOW")){case"BREAK":return r+`break
`;case"CONTINUE":return r+`continue
`}throw Error("Unknown flow statement.")},se=function(e,t){return e=Number(e.getFieldValue("NUM")),e===1/0?['float("inf")',o.FUNCTION_CALL]:e===-1/0?['-float("inf")',o.UNARY_SIGN]:[String(e),e<0?o.UNARY_SIGN:o.ATOMIC]},le=function(e,t){var r={ADD:[" + ",o.ADDITIVE],MINUS:[" - ",o.ADDITIVE],MULTIPLY:[" * ",o.MULTIPLICATIVE],DIVIDE:[" / ",o.MULTIPLICATIVE],POWER:[" ** ",o.EXPONENTIATION]}[e.getFieldValue("OP")];const n=r[0];r=r[1];const i=t.valueToCode(e,"A",r)||"0";return e=t.valueToCode(e,"B",r)||"0",[i+n+e,r]},L=function(e,t){const r=e.getFieldValue("OP");let n;if(r==="NEG")return n=t.valueToCode(e,"NUM",o.UNARY_SIGN)||"0",["-"+n,o.UNARY_SIGN];switch(t.definitions_.import_math="import math",e=r==="SIN"||r==="COS"||r==="TAN"?t.valueToCode(e,"NUM",o.MULTIPLICATIVE)||"0":t.valueToCode(e,"NUM",o.NONE)||"0",r){case"ABS":n="math.fabs("+e+")";break;case"ROOT":n="math.sqrt("+e+")";break;case"LN":n="math.log("+e+")";break;case"LOG10":n="math.log10("+e+")";break;case"EXP":n="math.exp("+e+")";break;case"POW10":n="math.pow(10,"+e+")";break;case"ROUND":n="round("+e+")";break;case"ROUNDUP":n="math.ceil("+e+")";break;case"ROUNDDOWN":n="math.floor("+e+")";break;case"SIN":n="math.sin("+e+" / 180.0 * math.pi)";break;case"COS":n="math.cos("+e+" / 180.0 * math.pi)";break;case"TAN":n="math.tan("+e+" / 180.0 * math.pi)"}if(n)return[n,o.FUNCTION_CALL];switch(r){case"ASIN":n="math.asin("+e+") / math.pi * 180";break;case"ACOS":n="math.acos("+e+") / math.pi * 180";break;case"ATAN":n="math.atan("+e+") / math.pi * 180";break;default:throw Error("Unknown math operator: "+r)}return[n,o.MULTIPLICATIVE]},ue=function(e,t){const r={PI:["math.pi",o.MEMBER],E:["math.e",o.MEMBER],GOLDEN_RATIO:["(1 + math.sqrt(5)) / 2",o.MULTIPLICATIVE],SQRT2:["math.sqrt(2)",o.MEMBER],SQRT1_2:["math.sqrt(1.0 / 2)",o.MEMBER],INFINITY:["float('inf')",o.ATOMIC]};return e=e.getFieldValue("CONSTANT"),e!=="INFINITY"&&(t.definitions_.import_math="import math"),r[e]},de=function(e,t){var r={EVEN:[" % 2 == 0",o.MULTIPLICATIVE,o.RELATIONAL],ODD:[" % 2 == 1",o.MULTIPLICATIVE,o.RELATIONAL],WHOLE:[" % 1 == 0",o.MULTIPLICATIVE,o.RELATIONAL],POSITIVE:[" > 0",o.RELATIONAL,o.RELATIONAL],NEGATIVE:[" < 0",o.RELATIONAL,o.RELATIONAL],DIVISIBLE_BY:[null,o.MULTIPLICATIVE,o.RELATIONAL],PRIME:[null,o.NONE,o.FUNCTION_CALL]};const n=e.getFieldValue("PROPERTY"),[i,s,$]=r[n];if(r=t.valueToCode(e,"NUMBER_TO_CHECK",s)||"0",n==="PRIME")t.definitions_.import_math="import math",t.definitions_.from_numbers_import_Number="from numbers import Number",e=t.provideFunction_("math_isPrime",`
def ${t.FUNCTION_NAME_PLACEHOLDER_}(n):
  # https://en.wikipedia.org/wiki/Primality_test#Naive_methods
  # If n is not a number but a string, try parsing it.
  if not isinstance(n, Number):
    try:
      n = float(n)
    except:
      return False
  if n == 2 or n == 3:
    return True
  # False if n is negative, is 1, or not whole, or if n is divisible by 2 or 3.
  if n <= 1 or n % 1 != 0 or n % 2 == 0 or n % 3 == 0:
    return False
  # Check all the numbers of form 6k +/- 1, up to sqrt(n).
  for x in range(6, int(math.sqrt(n)) + 2, 6):
    if n % (x - 1) == 0 or n % (x + 1) == 0:
      return False
  return True
`)+"("+r+")";else if(n==="DIVISIBLE_BY"){if(e=t.valueToCode(e,"DIVISOR",o.MULTIPLICATIVE)||"0",e==="0")return["False",o.ATOMIC];e=r+" % "+e+" == 0"}else e=r+i;return[e,$]},$e=function(e,t){t.definitions_.from_numbers_import_Number="from numbers import Number";const r=t.valueToCode(e,"DELTA",o.ADDITIVE)||"0";return e=t.getVariableName(e.getFieldValue("VAR")),e+" = ("+e+" if isinstance("+e+", Number) else 0) + "+r+`
`},ce=function(e,t){const r=e.getFieldValue("OP");switch(e=t.valueToCode(e,"LIST",o.NONE)||"[]",r){case"SUM":t="sum("+e+")";break;case"MIN":t="min("+e+")";break;case"MAX":t="max("+e+")";break;case"AVERAGE":t.definitions_.from_numbers_import_Number="from numbers import Number",t=t.provideFunction_("math_mean",`
def ${t.FUNCTION_NAME_PLACEHOLDER_}(myList):
  localList = [e for e in myList if isinstance(e, Number)]
  if not localList: return
  return float(sum(localList)) / len(localList)
`)+"("+e+")";break;case"MEDIAN":t.definitions_.from_numbers_import_Number="from numbers import Number",t=t.provideFunction_("math_median",`
def ${t.FUNCTION_NAME_PLACEHOLDER_}(myList):
  localList = sorted([e for e in myList if isinstance(e, Number)])
  if not localList: return
  if len(localList) % 2 == 0:
    return (localList[len(localList) // 2 - 1] + localList[len(localList) // 2]) / 2.0
  else:
    return localList[(len(localList) - 1) // 2]
`)+"("+e+")";break;case"MODE":t=t.provideFunction_("math_modes",`
def ${t.FUNCTION_NAME_PLACEHOLDER_}(some_list):
  modes = []
  # Using a lists of [item, count] to keep count rather than dict
  # to avoid "unhashable" errors when the counted item is itself a list or dict.
  counts = []
  maxCount = 1
  for item in some_list:
    found = False
    for count in counts:
      if count[0] == item:
        count[1] += 1
        maxCount = max(maxCount, count[1])
        found = True
    if not found:
      counts.append([item, 1])
  for counted_item, item_count in counts:
    if item_count == maxCount:
      modes.append(counted_item)
  return modes
`)+"("+e+")";break;case"STD_DEV":t.definitions_.import_math="import math",t=t.provideFunction_("math_standard_deviation",`
def ${t.FUNCTION_NAME_PLACEHOLDER_}(numbers):
  n = len(numbers)
  if n == 0: return
  mean = float(sum(numbers)) / n
  variance = sum((x - mean) ** 2 for x in numbers) / n
  return math.sqrt(variance)
`)+"("+e+")";break;case"RANDOM":t.definitions_.import_random="import random",t="random.choice("+e+")";break;default:throw Error("Unknown operator: "+r)}return[t,o.FUNCTION_CALL]},ae=function(e,t){const r=t.valueToCode(e,"DIVIDEND",o.MULTIPLICATIVE)||"0";return e=t.valueToCode(e,"DIVISOR",o.MULTIPLICATIVE)||"0",[r+" % "+e,o.MULTIPLICATIVE]},Ee=function(e,t){const r=t.valueToCode(e,"VALUE",o.NONE)||"0",n=t.valueToCode(e,"LOW",o.NONE)||"0";return e=t.valueToCode(e,"HIGH",o.NONE)||"float('inf')",["min(max("+r+", "+n+"), "+e+")",o.FUNCTION_CALL]},me=function(e,t){t.definitions_.import_random="import random";const r=t.valueToCode(e,"FROM",o.NONE)||"0";return e=t.valueToCode(e,"TO",o.NONE)||"0",["random.randint("+r+", "+e+")",o.FUNCTION_CALL]},_e=function(e,t){return t.definitions_.import_random="import random",["random.random()",o.FUNCTION_CALL]},Te=function(e,t){t.definitions_.import_math="import math";const r=t.valueToCode(e,"X",o.NONE)||"0";return["math.atan2("+(t.valueToCode(e,"Y",o.NONE)||"0")+", "+r+") / math.pi * 180",o.MULTIPLICATIVE]},y=function(e,t){var r=[],n=e.workspace,i=l.allUsedVarModels$$module$build$src$core$variables(n)||[];for(var s of i)i=s.getName(),e.getVars().includes(i)||r.push(t.getVariableName(i));for(n=l.allDeveloperVariables$$module$build$src$core$variables(n),s=0;s<n.length;s++)r.push(t.nameDB_.getName(n[s],l.NameType$$module$build$src$core$names.DEVELOPER_VARIABLE));n=r.length?t.INDENT+"global "+r.join(", ")+`
`:"",r=t.getProcedureName(e.getFieldValue("NAME")),s="",t.STATEMENT_PREFIX&&(s+=t.injectId(t.STATEMENT_PREFIX,e)),t.STATEMENT_SUFFIX&&(s+=t.injectId(t.STATEMENT_SUFFIX,e)),s&&(s=t.prefixLines(s,t.INDENT)),i="",t.INFINITE_LOOP_TRAP&&(i=t.prefixLines(t.injectId(t.INFINITE_LOOP_TRAP,e),t.INDENT));let $="";e.getInput("STACK")&&($=t.statementToCode(e,"STACK"));let m="";e.getInput("RETURN")&&(m=t.valueToCode(e,"RETURN",o.NONE)||"");let p="";$&&m&&(p=s),m?m=t.INDENT+"return "+m+`
`:$||($=t.PASS);const I=[],a=e.getVars();for(let _=0;_<a.length;_++)I[_]=t.getVariableName(a[_]);return n="def "+r+"("+I.join(", ")+`):
`+n+s+i+$+p+m,n=t.scrub_(e,n),t.definitions_["%"+r]=n,null},Ne=function(e,t){const r=t.getProcedureName(e.getFieldValue("NAME")),n=[],i=e.getVars();for(let s=0;s<i.length;s++)n[s]=t.valueToCode(e,"ARG"+s,o.NONE)||"None";return[r+"("+n.join(", ")+")",o.FUNCTION_CALL]},pe=function(e,t){return t.forBlock.procedures_callreturn(e,t)[0]+`
`},Ie=function(e,t){let r="if "+(t.valueToCode(e,"CONDITION",o.NONE)||"False")+`:
`;return t.STATEMENT_SUFFIX&&(r+=t.prefixLines(t.injectId(t.STATEMENT_SUFFIX,e),t.INDENT)),e.hasReturnValue_?(e=t.valueToCode(e,"VALUE",o.NONE)||"None",r+=t.INDENT+"return "+e+`
`):r+=t.INDENT+`return
`,r},Ae=function(e,t){return[t.quote_(e.getFieldValue("TEXT")),o.ATOMIC]},Oe=function(e,t){switch(e.itemCount_){case 0:return["''",o.ATOMIC];case 1:return e=t.valueToCode(e,"ADD0",o.NONE)||"''",O(e);case 2:var r=t.valueToCode(e,"ADD0",o.NONE)||"''";return e=t.valueToCode(e,"ADD1",o.NONE)||"''",[O(r)[0]+" + "+O(e)[0],o.ADDITIVE];default:r=[];for(let n=0;n<e.itemCount_;n++)r[n]=t.valueToCode(e,"ADD"+n,o.NONE)||"''";return e=t.nameDB_.getDistinctName("x",l.NameType$$module$build$src$core$names.VARIABLE),["''.join([str("+e+") for "+e+" in ["+r.join(", ")+"]])",o.FUNCTION_CALL]}},he=function(e,t){const r=t.getVariableName(e.getFieldValue("VAR"));return e=t.valueToCode(e,"TEXT",o.NONE)||"''",r+" = str("+r+") + "+O(e)[0]+`
`},Le=function(e,t){return["len("+(t.valueToCode(e,"VALUE",o.NONE)||"''")+")",o.FUNCTION_CALL]},ge=function(e,t){return["not len("+(t.valueToCode(e,"VALUE",o.NONE)||"''")+")",o.LOGICAL_NOT]},fe=function(e,t){const r=e.getFieldValue("END")==="FIRST"?"find":"rfind",n=t.valueToCode(e,"FIND",o.NONE)||"''";return t=(t.valueToCode(e,"VALUE",o.MEMBER)||"''")+"."+r+"("+n+")",e.workspace.options.oneBasedIndex?[t+" + 1",o.ADDITIVE]:[t,o.FUNCTION_CALL]},Ce=function(e,t){const r=e.getFieldValue("WHERE")||"FROM_START",n=t.valueToCode(e,"VALUE",r==="RANDOM"?o.NONE:o.MEMBER)||"''";switch(r){case"FIRST":return[n+"[0]",o.MEMBER];case"LAST":return[n+"[-1]",o.MEMBER];case"FROM_START":return e=t.getAdjustedInt(e,"AT"),[n+"["+e+"]",o.MEMBER];case"FROM_END":return e=t.getAdjustedInt(e,"AT",1,!0),[n+"["+e+"]",o.MEMBER];case"RANDOM":return t.definitions_.import_random="import random",[t.provideFunction_("text_random_letter",`
def ${t.FUNCTION_NAME_PLACEHOLDER_}(text):
  x = int(random.random() * len(text))
  return text[x]
`)+"("+n+")",o.FUNCTION_CALL]}throw Error("Unhandled option (text_charAt).")},Re=function(e,t){var r=e.getFieldValue("WHERE1");const n=e.getFieldValue("WHERE2"),i=t.valueToCode(e,"STRING",o.MEMBER)||"''";switch(r){case"FROM_START":r=t.getAdjustedInt(e,"AT1"),r===0&&(r="");break;case"FROM_END":r=t.getAdjustedInt(e,"AT1",1,!0);break;case"FIRST":r="";break;default:throw Error("Unhandled option (text_getSubstring)")}switch(n){case"FROM_START":e=t.getAdjustedInt(e,"AT2",1);break;case"FROM_END":e=t.getAdjustedInt(e,"AT2",0,!0),l.isNumber$$module$build$src$core$utils$string(String(e))?e===0&&(e=""):(t.definitions_.import_sys="import sys",e+=" or sys.maxsize");break;case"LAST":e="";break;default:throw Error("Unhandled option (text_getSubstring)")}return[i+"["+r+" : "+e+"]",o.MEMBER]},Me=function(e,t){const r={UPPERCASE:".upper()",LOWERCASE:".lower()",TITLECASE:".title()"}[e.getFieldValue("CASE")];return[(t.valueToCode(e,"TEXT",o.MEMBER)||"''")+r,o.FUNCTION_CALL]},Fe=function(e,t){const r={LEFT:".lstrip()",RIGHT:".rstrip()",BOTH:".strip()"}[e.getFieldValue("MODE")];return[(t.valueToCode(e,"TEXT",o.MEMBER)||"''")+r,o.FUNCTION_CALL]},ye=function(e,t){return"print("+(t.valueToCode(e,"TEXT",o.NONE)||"''")+`)
`},S=function(e,t){var r=t.provideFunction_("text_prompt",`
def ${t.FUNCTION_NAME_PLACEHOLDER_}(msg):
  try:
    return raw_input(msg)
  except NameError:
    return input(msg)
`);return t=e.getField("TEXT")?t.quote_(e.getFieldValue("TEXT")):t.valueToCode(e,"TEXT",o.NONE)||"''",r=r+"("+t+")",e.getFieldValue("TYPE")==="NUMBER"&&(r="float("+r+")"),[r,o.FUNCTION_CALL]},Se=function(e,t){const r=t.valueToCode(e,"TEXT",o.MEMBER)||"''";return e=t.valueToCode(e,"SUB",o.NONE)||"''",[r+".count("+e+")",o.FUNCTION_CALL]},ve=function(e,t){const r=t.valueToCode(e,"TEXT",o.MEMBER)||"''",n=t.valueToCode(e,"FROM",o.NONE)||"''";return e=t.valueToCode(e,"TO",o.NONE)||"''",[r+".replace("+n+", "+e+")",o.MEMBER]},De=function(e,t){return[(t.valueToCode(e,"TEXT",o.MEMBER)||"''")+"[::-1]",o.MEMBER]},v=function(e,t){return[t.getVariableName(e.getFieldValue("VAR")),o.ATOMIC]},D=function(e,t){const r=t.valueToCode(e,"VALUE",o.NONE)||"0";return t.getVariableName(e.getFieldValue("VAR"))+" = "+r+`
`},o;(function(e){e[e.ATOMIC=0]="ATOMIC",e[e.COLLECTION=1]="COLLECTION",e[e.STRING_CONVERSION=1]="STRING_CONVERSION",e[e.MEMBER=2.1]="MEMBER",e[e.FUNCTION_CALL=2.2]="FUNCTION_CALL",e[e.EXPONENTIATION=3]="EXPONENTIATION",e[e.UNARY_SIGN=4]="UNARY_SIGN",e[e.BITWISE_NOT=4]="BITWISE_NOT",e[e.MULTIPLICATIVE=5]="MULTIPLICATIVE",e[e.ADDITIVE=6]="ADDITIVE",e[e.BITWISE_SHIFT=7]="BITWISE_SHIFT",e[e.BITWISE_AND=8]="BITWISE_AND",e[e.BITWISE_XOR=9]="BITWISE_XOR",e[e.BITWISE_OR=10]="BITWISE_OR",e[e.RELATIONAL=11]="RELATIONAL",e[e.LOGICAL_NOT=12]="LOGICAL_NOT",e[e.LOGICAL_AND=13]="LOGICAL_AND",e[e.LOGICAL_OR=14]="LOGICAL_OR",e[e.CONDITIONAL=15]="CONDITIONAL",e[e.LAMBDA=16]="LAMBDA",e[e.NONE=99]="NONE"})(o||(o={}));var x=class extends l.CodeGenerator$$module$build$src$core$generator{constructor(e="Python"){super(e),this.ORDER_OVERRIDES=[[o.FUNCTION_CALL,o.MEMBER],[o.FUNCTION_CALL,o.FUNCTION_CALL],[o.MEMBER,o.MEMBER],[o.MEMBER,o.FUNCTION_CALL],[o.LOGICAL_NOT,o.LOGICAL_NOT],[o.LOGICAL_AND,o.LOGICAL_AND],[o.LOGICAL_OR,o.LOGICAL_OR]],this.PASS="",this.isInitialized=!1;for(const t in o)e=o[t],typeof e!="string"&&(this["ORDER_"+t]=e);this.addReservedWords("False,None,True,and,as,assert,break,class,continue,def,del,elif,else,except,exec,finally,for,from,global,if,import,in,is,lambda,nonlocal,not,or,pass,print,raise,return,try,while,with,yield,NotImplemented,Ellipsis,__debug__,quit,exit,copyright,license,credits,ArithmeticError,AssertionError,AttributeError,BaseException,BlockingIOError,BrokenPipeError,BufferError,BytesWarning,ChildProcessError,ConnectionAbortedError,ConnectionError,ConnectionRefusedError,ConnectionResetError,DeprecationWarning,EOFError,Ellipsis,EnvironmentError,Exception,FileExistsError,FileNotFoundError,FloatingPointError,FutureWarning,GeneratorExit,IOError,ImportError,ImportWarning,IndentationError,IndexError,InterruptedError,IsADirectoryError,KeyError,KeyboardInterrupt,LookupError,MemoryError,ModuleNotFoundError,NameError,NotADirectoryError,NotImplemented,NotImplementedError,OSError,OverflowError,PendingDeprecationWarning,PermissionError,ProcessLookupError,RecursionError,ReferenceError,ResourceWarning,RuntimeError,RuntimeWarning,StandardError,StopAsyncIteration,StopIteration,SyntaxError,SyntaxWarning,SystemError,SystemExit,TabError,TimeoutError,TypeError,UnboundLocalError,UnicodeDecodeError,UnicodeEncodeError,UnicodeError,UnicodeTranslateError,UnicodeWarning,UserWarning,ValueError,Warning,ZeroDivisionError,_,__build_class__,__debug__,__doc__,__import__,__loader__,__name__,__package__,__spec__,abs,all,any,apply,ascii,basestring,bin,bool,buffer,bytearray,bytes,callable,chr,classmethod,cmp,coerce,compile,complex,copyright,credits,delattr,dict,dir,divmod,enumerate,eval,exec,execfile,exit,file,filter,float,format,frozenset,getattr,globals,hasattr,hash,help,hex,id,input,int,intern,isinstance,issubclass,iter,len,license,list,locals,long,map,max,memoryview,min,next,object,oct,open,ord,pow,print,property,quit,range,raw_input,reduce,reload,repr,reversed,round,set,setattr,slice,sorted,staticmethod,str,sum,super,tuple,type,unichr,unicode,vars,xrange,zip")}init(e){super.init(e),this.PASS=this.INDENT+`pass
`,this.nameDB_?this.nameDB_.reset():this.nameDB_=new l.Names$$module$build$src$core$names(this.RESERVED_WORDS_),this.nameDB_.setVariableMap(e.getVariableMap()),this.nameDB_.populateVariables(e),this.nameDB_.populateProcedures(e);const t=[];var r=l.allDeveloperVariables$$module$build$src$core$variables(e);for(let n=0;n<r.length;n++)t.push(this.nameDB_.getName(r[n],l.Names$$module$build$src$core$names.DEVELOPER_VARIABLE_TYPE)+" = None");for(e=l.allUsedVarModels$$module$build$src$core$variables(e),r=0;r<e.length;r++)t.push(this.getVariableName(e[r].getId())+" = None");this.definitions_.variables=t.join(`
`),this.isInitialized=!0}finish(e){const t=[],r=[];for(let n in this.definitions_){const i=this.definitions_[n];i.match(/^(from\s+\S+\s+)?import\s+\S+/)?t.push(i):r.push(i)}return e=super.finish(e),this.isInitialized=!1,this.nameDB_.reset(),(t.join(`
`)+`

`+r.join(`

`)).replace(/\n\n+/g,`

`).replace(/\n*$/,`


`)+e}scrubNakedValue(e){return e+`
`}quote_(e){e=e.replace(/\\/g,"\\\\").replace(/\n/g,`\\
`);let t="'";return e.includes("'")&&(e.includes('"')?e=e.replace(/'/g,"\\'"):t='"'),t+e+t}multiline_quote_(e){return e.split(/\n/g).map(this.quote_).join(` + '\\n' + 
`)}scrub_(e,t,r=!1){let n="";if(!e.outputConnection||!e.outputConnection.targetConnection){var i=e.getCommentText();i&&(i=l.wrap$$module$build$src$core$utils$string(i,this.COMMENT_WRAP-3),n+=this.prefixLines(i+`
`,"# "));for(let s=0;s<e.inputList.length;s++)e.inputList[s].type===l.inputTypes$$module$build$src$core$inputs$input_types.VALUE&&(i=e.inputList[s].connection.targetBlock())&&(i=this.allNestedComments(i))&&(n+=this.prefixLines(i,"# "))}return e=e.nextConnection&&e.nextConnection.targetBlock(),r=r?"":this.blockToCode(e),n+t+r}getAdjustedInt(e,t,r=0,n=!1){e.workspace.options.oneBasedIndex&&r--;const i=e.workspace.options.oneBasedIndex?"1":"0";return e=this.valueToCode(e,t,r?o.ADDITIVE:o.NONE)||i,l.isNumber$$module$build$src$core$utils$string(e)?(e=parseInt(e,10)+r,n&&(e=-e)):(e=r>0?"int("+e+" + "+r+")":r<0?"int("+e+" - "+-r+")":"int("+e+")",n&&(e="-"+e)),e}},c={};c.lists_create_empty=B,c.lists_create_with=b,c.lists_getIndex=W,c.lists_getSublist=H,c.lists_indexOf=j,c.lists_isEmpty=G,c.lists_length=w,c.lists_repeat=k,c.lists_reverse=z,c.lists_setIndex=X,c.lists_sort=q,c.lists_split=Y;var E={};E.controls_if=M,E.controls_ifelse=M,E.logic_boolean=Z,E.logic_compare=K,E.logic_negate=J,E.logic_null=ee,E.logic_operation=Q,E.logic_ternary=te;var T={};T.controls_flow_statements=ie,T.controls_for=oe,T.controls_forEach=ne,T.controls_repeat=F,T.controls_repeat_ext=F,T.controls_whileUntil=re;var d={};d.math_arithmetic=le,d.math_atan2=Te,d.math_change=$e,d.math_constant=ue,d.math_constrain=Ee,d.math_modulo=ae,d.math_number=se,d.math_number_property=de,d.math_on_list=ce,d.math_random_float=_e,d.math_random_int=me,d.math_round=L,d.math_single=L,d.math_trig=L;var N={};N.procedures_callnoreturn=pe,N.procedures_callreturn=Ne,N.procedures_defnoreturn=y,N.procedures_defreturn=y,N.procedures_ifreturn=Ie;var xe=/^\s*'([^']|\\')*'\s*$/,O=function(e){return xe.test(e)?[e,o.ATOMIC]:["str("+e+")",o.FUNCTION_CALL]},u={};u.text=Ae,u.text_append=he,u.text_changeCase=Me,u.text_charAt=Ce,u.text_count=Se,u.text_getSubstring=Re,u.text_indexOf=fe,u.text_isEmpty=ge,u.text_join=Oe,u.text_length=Le,u.text_print=ye,u.text_prompt=S,u.text_prompt_ext=S,u.text_replace=ve,u.text_reverse=De,u.text_trim=Fe;var g={};g.variables_get=v,g.variables_set=D;var f={};f.variables_get_dynamic=v,f.variables_set_dynamic=D;var C=new x;C.addReservedWords("math,random,Number");var U=Object.assign({},c,E,T,d,N,u,g,f);for(const e in U)C.forBlock[e]=U[e];var A={};return A.Order=o,A.PythonGenerator=x,A.pythonGenerator=C,A.__namespace__=l,A})})(h)),h.exports}var be=Be();const ke=Ue(be),{Order:We,PythonGenerator:Xe,pythonGenerator:He}=ke;export{We as O,He as p};
