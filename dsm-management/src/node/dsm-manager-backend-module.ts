import { ContainerModule } from 'inversify';
import { DsmManager } from './dsm-manager';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { IDsmManager } from "./dsm-manager-protocol";

export default new ContainerModule(bind => {
    bind(DsmManager).toSelf().inSingletonScope();
    bind(IDsmManager).toService(DsmManager);
    bind(BackendApplicationContribution).toService(DsmManager);
});