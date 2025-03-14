import { PF } from './pfapi';
import { PFModelCfg } from './pfapi.model';
import { PFModelCtrl } from './pfapi-model-ctrl';

interface MyModel {
  id: string;
  name: string;
  age: number;
}

interface MyModel2 {
  fooo: boolean;
}

type ModelCfgs = {
  m1: PFModelCfg<MyModel>;
  m2: PFModelCfg<MyModel2>;
};

const modelCfgs: ModelCfgs = {
  m1: {
    modelVersion: 1,
  },
  m2: {
    modelVersion: 1,
  },
  // THIS PART IS IMPORTANT!!!
} as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const pfapi = new PF(modelCfgs);
const _typeCheck: PFModelCtrl<MyModel> = {} as typeof pfapi.m.m1;
console.log(_typeCheck);

// SHOULD WORK => this should work (and it does)
console.log(pfapi.m.m1.save({ id: 'AA', name: 'test', age: 10 }));
console.log(pfapi.m.m2.save({ fooo: true }));

// EXPECT ERROR => this should error (and it does NOT)
// console.log(
//   pfapi.m.m1.save({ id: 'AA', name: 'test', age: 10, fooo: true, additional: 'aaa' }),
// );
// console.log(pfapi.m.m2.save({ id: 'xx', name: 'test', age: 10 }));
