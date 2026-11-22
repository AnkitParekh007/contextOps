import { createHash } from "node:crypto";
import { z } from "zod";
import { redactText, sanitizeValue } from "./redaction";

export const MAX_UPLOAD_BYTES=16*1024*1024;
export const MAX_TRACES=10000;
const aliases:Record<string,string> = {
  trace_id:"external_trace_id",id:"external_trace_id",externaltraceid:"external_trace_id",
  datetime:"timestamp",time:"timestamp",created_at:"timestamp",
  type:"task_type",tasktype:"task_type",input:"input_text",prompt:"input_text",
  prompttext:"input_text",prompt_template_id:"prompt_template",
  provider:"model_provider",model:"model_name",inputtokens:"input_tokens",
  outputtokens:"output_tokens",latency:"latency_ms",latencyms:"latency_ms",
  output:"output_text",result:"output_text",expected:"expected_output",
  label:"human_label",
};
const normalize=(key:string)=>key.trim().toLowerCase().replace(/[^a-z0-9]+/g,"_");
const traceSchema=z.object({
  external_trace_id:z.union([z.string(),z.number()]).optional(),
  timestamp:z.union([z.string(),z.number()]).optional(),
  task_type:z.string().min(1).max(80).default("unknown"),
  input_text:z.union([z.string(),z.number()]).optional(),
  prompt_template:z.string().optional(),
  model_provider:z.string().max(60).default("UNKNOWN"),
  model_name:z.string().max(120).default("unknown"),
  input_tokens:z.coerce.number().int().min(0).max(100000000).default(0),
  output_tokens:z.coerce.number().int().min(0).max(100000000).default(0),
  latency_ms:z.coerce.number().int().min(0).max(3600000).default(0),
  status:z.string().max(80).default("success"),
  error_message:z.string().optional(),
  output_text:z.union([z.string(),z.number()]).optional(),
  expected_output:z.union([z.string(),z.number()]).optional(),
  human_label:z.union([z.string(),z.number()]).optional(),
  quality_score:z.coerce.number().min(0).max(1).optional(),
  business_context_refs:z.unknown().optional(),
  metadata:z.record(z.unknown()).optional(),
});
export type CleanTrace={
  externalTraceId:string;timestamp:string;taskType:string;inputText:string|null;
  promptTemplate:string|null;modelProvider:string;modelName:string;
  inputTokens:number;outputTokens:number;latencyMs:number;status:string;
  errorMessage:string|null;outputText:string|null;expectedOutput:string|null;
  humanLabel:string|null;qualityScore:number|null;businessContextRefs:unknown;metadata:unknown;
};
function csvRows(input:string):string[][]{
  const result:string[][]=[];let row:string[]=[],value="",quoted=false;
  input=input.replace(/^\uFEFF/,"");
  for(let i=0;i<input.length;i++){
    const c=input[i];
    if(c==='"'){if(quoted&&input[i+1]==='"'){value+='"';i++;}else if(value===""||quoted){quoted=!quoted;}else{throw Error("Malformed CSV quotation");}}
    else if(c===","&&!quoted){row.push(value);value="";}
    else if((c==="\n"||c==="\r")&&!quoted){
      if(c==="\r"&&input[i+1]==="\n")i++;
      row.push(value);if(row.some(x=>x.trim()))result.push(row);row=[];value="";
    } else {value+=c;}
  }
  if(quoted)throw Error("Unterminated CSV quote");
  row.push(value);if(row.some(x=>x.trim()))result.push(row);
  return result;
}
export function parseRows(content:string,filename:string):unknown[]{
  const suffix=filename.toLowerCase().split(".").pop();
  if(suffix==="csv"){
    const rows=csvRows(content);
    if(rows.length<2)throw Error("CSV needs a header and at least one row");
    const headers=rows.shift()!.map(normalize);
    return rows.map(row=>Object.fromEntries(headers.map((key,i)=>[key,row[i]??""])));
  }
  if(suffix==="jsonl"||suffix==="ndjson")
    return content.split(/\r?\n/).filter(l=>l.trim()).map((line,i)=>{
      try{return JSON.parse(line);}catch{throw Error("Invalid JSONL on line "+(i+1));}
    });
  if(suffix==="json"){
    const parsed=JSON.parse(content);
    if(!Array.isArray(parsed))throw Error("JSON upload must contain an array of traces");
    return parsed;
  }
  throw Error("Use a .csv, .jsonl, .ndjson, or .json file");
}
export function cleanRows(raw:unknown[]):{rows:CleanTrace[];issues:string[]}{
  if(raw.length>MAX_TRACES)throw Error("Maximum 10,000 traces per upload");
  const rows:CleanTrace[]=[], issues:string[]=[];
  for(let i=0;i<raw.length;i++){
    const item=raw[i];
    if(!item||typeof item!=="object"||Array.isArray(item)){issues.push("Row "+(i+1)+": not an object");continue;}
    const mapped:Record<string,unknown>={};
    for(const [k,v] of Object.entries(item)){
      const key=normalize(k);mapped[aliases[key]??key]=v;
    }
    const parsed=traceSchema.safeParse(mapped);
    if(!parsed.success){issues.push("Row "+(i+1)+": invalid trace fields");continue;}
    const t=parsed.data, timestamp=t.timestamp?new Date(t.timestamp):new Date();
    if(!Number.isFinite(timestamp.getTime())){issues.push("Row "+(i+1)+": invalid timestamp");continue;}
    const redact=(v:unknown)=>v===undefined?null:redactText(String(v).slice(0,40000));
    const inputText=redact(t.input_text);
    const rawId=String(t.external_trace_id??createHash("sha256").update(JSON.stringify([timestamp.toISOString(),t.task_type,t.input_text,t.output_text])).digest("hex"));
    rows.push({
      externalTraceId:rawId.slice(0,200),timestamp:timestamp.toISOString(),
      taskType:redactText(t.task_type),inputText,
      promptTemplate:redact(t.prompt_template),modelProvider:redactText(t.model_provider),
      modelName:redactText(t.model_name),inputTokens:t.input_tokens,outputTokens:t.output_tokens,
      latencyMs:t.latency_ms,status:redactText(t.status),errorMessage:redact(t.error_message),
      outputText:redact(t.output_text),expectedOutput:redact(t.expected_output),
      humanLabel:redact(t.human_label),qualityScore:t.quality_score??null,
      businessContextRefs:sanitizeValue(t.business_context_refs??[]),metadata:sanitizeValue(t.metadata??{}),
    });
  }
  return {rows,issues:issues.slice(0,200)};
}

export const canonicalColumns=[
  "external_trace_id","timestamp","task_type","input_text","prompt_template",
  "model_provider","model_name","input_tokens","output_tokens","latency_ms",
  "status","error_message","output_text","expected_output","human_label",
  "quality_score","business_context_refs","metadata",
] as const;
export function mapColumns(raw:unknown[],mapping:Record<string,string>):unknown[]{
  const allowed=new Set<string>(canonicalColumns);
  const clean=Object.fromEntries(Object.entries(mapping).filter(([,target])=>target!==""));
  if(Object.entries(clean).length>30||Object.values(clean).some(v=>!allowed.has(v)))
    throw Error("Invalid column mapping");
  return raw.map(item=>{
    if(!item||typeof item!=="object"||Array.isArray(item))return item;
    return Object.fromEntries(Object.entries(item).map(([key,value])=>[
      clean[normalize(key)]??key,value,
    ]));
  });
}
