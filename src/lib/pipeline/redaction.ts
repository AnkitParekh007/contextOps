/** Defensive, best-effort sanitization. Not a substitute for enterprise DLP review. */
const patterns: Array<[RegExp,string]> = [
  [/\b(?:sk-[A-Za-z0-9_-]{12,}|sk-ant-[A-Za-z0-9_-]{12,}|AIza[A-Za-z0-9_-]{20,}|gh[ps]_[A-Za-z0-9_-]{20,})\b/g, "[REDACTED_API_KEY]"],
  [/\b(?:Bearer\s+)[A-Za-z0-9._~+/-]{16,}\b/gi, "[REDACTED_BEARER]"],
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]"],
  [/\b(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g, "[REDACTED_PHONE]"],
  [/\b(?:\d[ -]*?){13,19}\b/g, "[REDACTED_CARD_LIKE_NUMBER]"],
  [/(?:password|secret|api[_-]?key|authorization)\s*[:=]\s*[^\s,;]+/gi, "[REDACTED_CREDENTIAL]"],
];
export function redactText(value: string): string {
  let output = value;
  for (const [pattern,token] of patterns) output = output.replace(pattern,token);
  return output;
}
export function sanitizeValue(value: unknown, depth=0): unknown {
  if(depth>8) return "[MAX_DEPTH]";
  if(typeof value==="string") return redactText(value.slice(0,40000));
  if(Array.isArray(value)) return value.slice(0,100).map(v=>sanitizeValue(v,depth+1));
  if(value && typeof value==="object") {
    const result:Record<string,unknown>={};
    for(const [key,v] of Object.entries(value).slice(0,100)){
      if(/password|secret|token|api.?key|authorization|credential|private.?key/i.test(key)){
        result[key]="[REDACTED_SECRET_FIELD]";
      }else{result[key]=sanitizeValue(v,depth+1);}
    }
    return result;
  }
  return value;
}
