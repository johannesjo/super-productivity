import { PFAPI } from './pfapi';
import { PFAPIModelCfg } from './pfapi.model';
import { PfapiModelCtrl } from './pfapi-model-ctrl';

interface MyModel {
  id: string;
  name: string;
  age: number;
}

interface MyModel2 {
  fooo: boolean;
}

type ModelCfgs = [PFAPIModelCfg<MyModel>, PFAPIModelCfg<MyModel2>];
const modelCfgs: ModelCfgs = [
  {
    id: 'm1',
    modelVersion: 1,
  },
  {
    id: 'm2',
    modelVersion: 1,
  },
  // THIS PART IS IMPORTANT!!!
] as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const pfapi = new PFAPI(modelCfgs);

// SHOULD WORK => this should work (and it does)
console.log(pfapi.m.m1.save({ id: 'AA', name: 'test', age: 10 }));
console.log(pfapi.m.m2.save({ fooo: true }));

// EXPECT ERROR => this should error (and it does NOT)
console.log(
  pfapi.m.m1.save({ id: 'AA', name: 'test', age: 10, fooo: true, additional: 'aaa' }),
);
console.log(pfapi.m.m2.save({ id: 'xx', name: 'test', age: 10 }));

const _typeCheck: PfapiModelCtrl<MyModel> = {} as typeof pfapi.m.m1;
console.log(_typeCheck);

pfapi.m.m1.load().then((data) => {
  console.log(data);
  console.log(data.id);
});

pfapi.m.m2.load().then((data) => {
  console.log(data);
  console.log(data.id);
});
