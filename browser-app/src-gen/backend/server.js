// @ts-check
require('reflect-metadata');
const path = require('path');
const express = require('express');
const { Container } = require('inversify');
const { BackendApplication, CliManager } = require('@theia/core/lib/node');
const { backendApplicationModule } = require('@theia/core/lib/node/backend-application-module');
const { messagingBackendModule } = require('@theia/core/lib/node/messaging/messaging-backend-module');
const { loggerBackendModule } = require('@theia/core/lib/node/logger-backend-module');

const container = new Container();
container.load(backendApplicationModule);
container.load(messagingBackendModule);
container.load(loggerBackendModule);

function load(raw) {
    return Promise.resolve(raw.default).then(module =>
        container.load(module)
    )
}

function start(port, host, argv) {
    if (argv === undefined) {
        argv = process.argv;
    }

    const cliManager = container.get(CliManager);
    return cliManager.initializeCli(argv).then(function () {
        const application = container.get(BackendApplication);
        application.use(express.static(path.join(__dirname, '../../lib')));
        application.use(express.static(path.join(__dirname, '../../lib/index.html')));
        return application.start(port, host);
    });
}

module.exports = (port, host, argv) => Promise.resolve()
    .then(function () { return Promise.resolve(require('@theia/filesystem/lib/node/filesystem-backend-module')).then(load) })
    .then(function () { return Promise.resolve(require('@theia/filesystem/lib/node/download/file-download-backend-module')).then(load) })
    .then(function () { return Promise.resolve(require('@theia/workspace/lib/node/workspace-backend-module')).then(load) })
    .then(function () { return Promise.resolve(require('@theia/process/lib/node/process-backend-module')).then(load) })
    .then(function () { return Promise.resolve(require('@theia/languages/lib/node/languages-backend-module')).then(load) })
    .then(function () { return Promise.resolve(require('@theia/terminal/lib/node/terminal-backend-module')).then(load) })
    .then(function () { return Promise.resolve(require('post-language-server/lib/node/language-server-backend-module')).then(load) })
    .then(function () { return Promise.resolve(require('ast-service/lib/node/ast-service-backend-module')).then(load) })
    .then(function () { return Promise.resolve(require('dsm-wrapper/lib/node/dsm-wrapper-backend-module')).then(load) })
    .then(function () { return Promise.resolve(require('dsm-management/lib/node/dsm-manager-backend-module')).then(load) })
    .then(() => start(port, host, argv)).catch(reason => {
        console.error('Failed to start the backend application.');
        if (reason) {
            console.error(reason);
        }
        throw reason;
    });