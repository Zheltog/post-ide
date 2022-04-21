import { BackendApplicationContribution } from '@theia/core/lib/node';
import { ProcessErrorEvent } from '@theia/process/lib/node/process';
import { RawProcess, RawProcessFactory } from '@theia/process/lib/node/raw-process';
import * as cp from 'child_process';
import { Application } from 'express';
import * as glob from 'glob';
import { inject, injectable } from 'inversify';
import * as path from 'path';
import * as rpc from 'vscode-jsonrpc';
import { IDsmManager } from './dsm-manager-protocol';
import { ILogger } from '@theia/core';

@injectable()
export class DsmManager implements IDsmManager, BackendApplicationContribution {
    private started: boolean = false;
    private connection?: rpc.MessageConnection;

    constructor(
        @inject(RawProcessFactory) private readonly processFactory: RawProcessFactory,
        @inject(ILogger) private readonly logger: ILogger
    ) {}

    initialize() {
        this.logger.info("[DSM manager] Initialization").then(() => {})
        if (!this.started) {
            this.start().then(() => {});
        }
    }

    private async start() {
        const stuffPath = path.resolve(__dirname, '..', '..', 'build');
        const jarPaths = glob.sync('**/manager.jar', { cwd: stuffPath });
        if (jarPaths.length === 0) {
            throw new Error('The DSM manager launcher was not found.');
        }
        const jarPath = path.resolve(stuffPath, jarPaths[0]);
        const command = 'java';
        const args: string[] = [];
        args.push('-jar', jarPath);
        args.push('-am', './dsms/available-modules.json', '-sam');
        await this.logger.info('[DSM manager] Spawning launch process with command ' + command + ' and arguments ' + args);
        await this.spawnProcessAsync(command, args);
        await this.logger.info('[DSM manager] Spawned launch process');
        this.started = true;
    }

    protected spawnProcessAsync(
        command: string,
        args?: string[],
        options?: cp.SpawnOptions
    ): Promise<RawProcess> {
        const rawProcess = this.processFactory({ command, args, options });
        rawProcess.errorStream.on('data', this.showError.bind(this));
        return new Promise<RawProcess>((resolve, reject) => {
            rawProcess.onError((error: ProcessErrorEvent) => {
                this.onDidFailSpawnProcess(error);
                if (error.code === 'ENOENT') {
                    const guess = command.split(/\s+/).shift();
                    if (guess) {
                        reject(new Error(`Failed to spawn ${guess}\nPerhaps it is not on the PATH.`));
                        return;
                    }
                }
                reject(error);
            });
            process.nextTick(() => resolve(rawProcess));
        });
    }

    protected showError(data: string | Buffer) {
        this.logger.error(data.toString()).then(() => {});
    }

    protected onDidFailSpawnProcess(error: Error): void {
        this.logger.error('[DSM manager] Failed to spawn process: ' + error.message).then(() => {});
    }

    onStop(app?: Application) {
        this.dispose();
    }

    dispose(): void {
        if (this.connection) {
            this.connection.dispose();
        }
    }
}