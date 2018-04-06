const {
    targets
} = require('./config');
const {info, error} = require('./logger');
const Checker = require('./Checker');

targets.reduce((promise, target) => {
    return promise
        .then(() => {
            info(`Starting check for ${target.host}...`);

            const checker = new Checker(target);

            return Promise.resolve()
                .then(() => checker.checkFor('general', target.generalFilter))
                .then(() => {
                    info(`Check completed for ${target.host}`);
                }, err => {
                    error(`Unable to complete check for ${target.host}`, err);
                });
        });
}, Promise.resolve())
    .then(() => {
        info(`Check completed for ${targets.length} targets\n`);
    });
