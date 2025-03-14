import { PFAPI } from './pfapi';
import { PFAPIModelCfg } from './pfapi.model';

interface MyModel {
  id: string;
  name: string;
  age: number;
}

type ModelCfgs = [PFAPIModelCfg<MyModel>, PFAPIModelCfg<MyModel>];
const modelCfgs: ModelCfgs = [
  {
    id: 'myModelId',
    modelVersion: 1,
  },
  {
    id: 'myOtherModelId',
    modelVersion: 1,
  },
  // THIS PART IS IMPORTANT!!!
] as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const pfapi = new PFAPI(modelCfgs);
// console.log(pfapi.m.myModelId.save({ id: 'AA', name: 'test', age: 10 }));
// console.log(pfapi.m.myModelId.save({ id: 'AA', name: 'test', age: 10 }));
// console.log(pfapi.m.myOtherModelId.load());
// console.log(pfapi.m.oXXXXX.modelCfg);
// console.log(pfapi.m.XXXXXXXXXXA.modelCfg);

// // this should work
// pfapi.m.myModelId.save({ id: 'AA', name: 'test', age: 10 });
// pfapi.m.myOtherModelId.save({ id: 'AA', name: 'test', age: 10 });
//
// v = pfapi.m.myOtherModelId.modelCfg;
//
// // this should throw a typing error
// pfapi.m.otherd.save({ id: 'BB', name: 'test', age: 10 });
// // this should throw a typing error
// pfapi.m.nXotDefined.save({ id: 'CCC', name: 'test', age: 10 });
