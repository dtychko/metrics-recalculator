const {
    targets
} = require('./config');
const {info, error} = require('./logger');
const Calculator = require('./Calculator');

targets.reduce((promise, target) => {
    return promise
        .then(() => {
            info(`Starting recalculation for ${target.host}...`);

            const calculator = new Calculator(target);

            return Promise.resolve()
                .then(() => calculator.calculateFor('userStory', target.userStoryFilter))
                .then(() => calculator.calculateFor('feature', target.featureFilter))
                .then(() => calculator.calculateFor('epic', target.epicFilter))
                .then(() => calculator.calculateFor('request', target.requestFilter))
                .then(() => {
                    info(`Recalculation completed for ${target.host}`);
                }, err => {
                    error(`Unable to complete recalculation for ${target.host}`, err);
                });
        });
}, Promise.resolve())
    .then(() => {
        info(`Recalculation completed for ${targets.length} targets\n`);
    });
