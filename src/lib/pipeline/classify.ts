type MinimalTrace={taskType:string;inputText:string|null;humanLabel:string|null;expectedOutput:string|null;status:string;metadata:unknown};
export type Classification={
  category:string;confidence:number;risk:"LOW"|"MEDIUM"|"HIGH";
  suitability:"ELIGIBLE"|"REVIEW"|"BLOCKED";reason:string;evaluationApproach:string;
};
export function classify(trace:MinimalTrace):Classification{
  const input=(trace.inputText??"").toLowerCase(),type=trace.taskType.toLowerCase();
  const meta=trace.metadata&&typeof trace.metadata==="object"?trace.metadata as Record<string,unknown>:{};
  const flagged=meta.sensitive===true||/medical|legal|financial advice|regulated|social.security|ssn|private.key|access.token|credential|password|payment.card/i.test(input+" "+type);
  const contaminated=/\[REDACTED_(?:CREDENTIAL|API_KEY|BEARER|CARD_LIKE_NUMBER)\]/i.test(input);
  const complex=/agent|multi.?step|negotiat|reasoning|tool.?use|function.?call/i.test(type);
  let category="UNKNOWN",confidence=0.5,evaluationApproach="human-reviewed rubric";
  if(/support|ticket|classif|triage|lead/.test(type)){category="ROUTINE_CLASSIFICATION";confidence=0.97;evaluationApproach="accuracy and macro-F1";}
  else if(/extract|invoice|document|json/.test(type)){category="STRUCTURED_EXTRACTION";confidence=0.95;evaluationApproach="field-level exact match and schema validity";}
  else if(/follow.?up|email|generation|sales/.test(type)){category="ROUTINE_GENERATION";confidence=0.9;evaluationApproach="human rubric and format validation";}
  else if(/policy|retriev|knowledge|rag|q&a/.test(type)){category="KNOWLEDGE_RETRIEVAL";confidence=0.88;evaluationApproach="groundedness and human-reviewed correctness";}
  if(complex){category="COMPLEX_REASONING";confidence=0.95;}
  if(flagged||contaminated)return {category:"SENSITIVE_OR_REGULATED",confidence:0.99,risk:"HIGH",suitability:"BLOCKED",
    reason:"Sensitive data or regulated context detected; explicit human approval and premium workflow required",evaluationApproach:"human review only"};
  if(complex)return {category,confidence,risk:"HIGH",suitability:"BLOCKED",reason:"Complex/tool workflow is excluded from automatic low-cost routing",evaluationApproach};
  if(category==="UNKNOWN")return {category,confidence,risk:"MEDIUM",suitability:"REVIEW",reason:"Unknown task category; needs human classification",evaluationApproach};
  if(trace.status.toLowerCase()!=="success")return {category,confidence,risk:"MEDIUM",suitability:"REVIEW",reason:"Previous execution failed",evaluationApproach};
  if(!trace.humanLabel&&!trace.expectedOutput)return {category,confidence,risk:"MEDIUM",suitability:"REVIEW",reason:"No ground-truth labels available for quality evaluation",evaluationApproach};
  return {category,confidence,risk:"LOW",suitability:"ELIGIBLE",reason:"Repeatable task with available evaluation label; cheaper models still require a quality benchmark",evaluationApproach};
}
