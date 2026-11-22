import "server-only";

export type InferenceResult={text:string;inputTokens:number;outputTokens:number;latencyMs:number};
export type ProviderKey="MOCK"|"ANTHROPIC"|"OPENAI";
export type InferenceInput={text:string;model:string;provider:ProviderKey;taskType:string;labelSet:string[]};
function ticketClassify(text:string){
  const lower=text.toLowerCase();
  // Specific incident intent takes priority over incidental words such as "tracking".
  if(/crash|error|dashboard|technical|bug/.test(lower))return "technical issue";
  if(/refund|return(ed)?/.test(lower))return "refund request";
  if(/login|log in|account|sign in/.test(lower))return "account access";
  if(/invoice|billing|charge|fee|payment/.test(lower))return "billing question";
  if(/shipment|shipping|arrive|tracking|delivery/.test(lower))return "shipping status";
  return "spam/other";
}
async function mockProvider(input:InferenceInput):Promise<InferenceResult>{
  const start=Date.now();
  const label=ticketClassify(input.text);
  const match=input.text.match(/\b\d{5}\b/);
  const number=match?Number(match[0]):0;
  const text=input.model==="mock-efficient"&&number!==0&&number%19===0?"spam/other":label;
  return {text,inputTokens:Math.max(1,Math.ceil(input.text.length/4)),
    outputTokens:Math.max(1,Math.ceil(text.length/4)),latencyMs:Math.max(1,Date.now()-start)};
}
export async function infer(input:InferenceInput,consent=false):Promise<InferenceResult>{
  if(input.provider==="MOCK")return mockProvider(input);
  if(!consent)throw Error("Explicit consent required before external model processing");
  if(!input.text||input.text.includes("[REDACTED_CREDENTIAL]")||input.text.includes("[REDACTED_API_KEY]"))
    throw Error("Sensitive trace cannot be sent externally");
  const started=Date.now();
  const labels=input.labelSet.length? "Return exactly one label from: "+input.labelSet.join(", "):
    "Return a short, strictly factual answer in the output format requested.";
  if(input.provider==="OPENAI"){
    if(!process.env.OPENAI_API_KEY)throw Error("OPENAI_API_KEY is not configured");
    const res=await fetch("https://api.openai.com/v1/chat/completions",{
      method:"POST",headers:{"Authorization":"Bearer "+process.env.OPENAI_API_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({model:input.model,messages:[
        {role:"system",content:"You are classifying a business task. "+labels},
        {role:"user",content:input.text},
      ],max_completion_tokens:128}),signal:AbortSignal.timeout(25000),
    });
    if(!res.ok)throw Error("OpenAI inference failed (HTTP "+res.status+")");
    const data=await res.json() as {choices?:Array<{message?:{content?:string}}>;usage?:{prompt_tokens?:number;completion_tokens?:number}};
    return {text:data.choices?.[0]?.message?.content?.trim()??"",inputTokens:data.usage?.prompt_tokens??0,
      outputTokens:data.usage?.completion_tokens??0,latencyMs:Date.now()-started};
  }
  if(input.provider==="ANTHROPIC"){
    if(!process.env.ANTHROPIC_API_KEY)throw Error("ANTHROPIC_API_KEY is not configured");
    const res=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",headers:{"x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","Content-Type":"application/json"},
      body:JSON.stringify({model:input.model,max_tokens:128,system:"You are classifying a business task. "+labels,
        messages:[{role:"user",content:input.text}]}),signal:AbortSignal.timeout(25000),
    });
    if(!res.ok)throw Error("Anthropic inference failed (HTTP "+res.status+")");
    const data=await res.json() as {content?:Array<{type:string;text?:string}>;usage?:{input_tokens?:number;output_tokens?:number}};
    return {text:data.content?.filter(c=>c.type==="text").map(c=>c.text??"").join("").trim()??"",
      inputTokens:data.usage?.input_tokens??0,outputTokens:data.usage?.output_tokens??0,latencyMs:Date.now()-started};
  }
  throw Error("Unsupported provider");
}
