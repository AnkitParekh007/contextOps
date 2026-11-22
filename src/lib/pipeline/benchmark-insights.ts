/** Diagnostics only. Different cohorts never establish causality or production drift. */
export function compareRunQuality(current:{
  quality:number;provider:string;model:string;fingerprint:string;size:number;
},previous:{
  quality:number;provider:string;model:string;fingerprint:string;size:number;
}){
  const comparable=current.provider===previous.provider&&
    current.model===previous.model;
  const identicalSample=current.fingerprint===previous.fingerprint;
  const delta=Number((current.quality-previous.quality).toFixed(6));
  return {
    comparableModel:comparable,identicalSample,
    deltaQuality:comparable?delta:null,
    flaggedForReview:comparable&&delta<=-.05,
    explanation:!comparable?"Provider or model differs; comparison is not meaningful":
      identicalSample?"Same sample: differences may reflect model nondeterminism, not population drift":
      "Different populations/time windows; exploratory quality delta only, not causality or verified drift",
  };
}
export function reconcileAggregate(input:{
  billedTotalUsd:number;overheadUsd:number;successfulTasks:number;
  billedTasks:number;modeledSampleCostUsd:number;sampleSize:number;
}){
  if(Object.values(input).some(n=>!Number.isFinite(n)||n<0)||
    !Number.isInteger(input.billedTasks)||!Number.isInteger(input.successfulTasks)||
    input.successfulTasks>input.billedTasks||input.billedTasks<1)
    throw Error("Invalid invoice aggregate");
  const observedCostPerSuccess=input.successfulTasks?
    (input.billedTotalUsd+input.overheadUsd)/input.successfulTasks:null;
  const modeledCostPerAttempt=input.sampleSize>0?
    input.modeledSampleCostUsd/input.sampleSize:null;
  return {observedCostPerSuccess,modeledCostPerAttempt,
    comparableScope:false,invoiceVerified:false,
    evidenceLevel:"SELF_REPORTED_UNVERIFIED",
    warning:"Different time periods and cost scopes must not be interpreted as savings or model quality evidence."};
}
