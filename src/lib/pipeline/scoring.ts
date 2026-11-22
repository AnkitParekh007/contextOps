export type MetricExample={expected:string;actual:string;valid:boolean};
export function compareOutput(expected:string,actual:string,category:string){
  if(category==="STRUCTURED_EXTRACTION"){
    try{
      const a=JSON.parse(expected),b=JSON.parse(actual);
      if(!a||typeof a!=="object"||!b||typeof b!=="object")return false;
      return Object.entries(a).every(([key,value])=>JSON.stringify(b[key])===JSON.stringify(value));
    }catch{return false;}
  }
  // Never auto-score natural-language generation/retrieval as a factual pass.
  if(!["ROUTINE_CLASSIFICATION","STRUCTURED_EXTRACTION"].includes(category))return false;
  return expected.trim().toLowerCase()===actual.trim().toLowerCase();
}
export function macroF1(examples:MetricExample[]):number{
  const labels=new Set(examples.flatMap(x=>[x.expected,x.actual]));
  if(!examples.length||!labels.size)return 0;
  let sum=0;
  for(const label of labels){
    const tp=examples.filter(x=>x.expected===label&&x.actual===label).length;
    const fp=examples.filter(x=>x.expected!==label&&x.actual===label).length;
    const fn=examples.filter(x=>x.expected===label&&x.actual!==label).length;
    const precision=tp+fp?tp/(tp+fp):0,recall=tp+fn?tp/(tp+fn):0;
    sum+=precision+recall?2*precision*recall/(precision+recall):0;
  }
  return sum/labels.size;
}
