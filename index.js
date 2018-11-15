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
                .then(() => calculator.calculateFor('task', target.taskFilter))
                .then(() => calculator.calculateFor('bug', target.bugFilter))
                .then(() => calculator.calculateFor('userStory', target.userStoryFilter))
                .then(() => calculator.calculateFor('feature', target.featureFilter))
                .then(() => calculator.calculateFor('epic', target.epicFilter))
                .then(() => calculator.calculateFor('request', target.requestFilter))
                .then(() => calculator.calculateFor('iteration', target.iterationFilter))
                .then(() => calculator.calculateFor('teamIteration', target.teamIterationFilter))
                .then(() => calculator.calculateFor('release', target.releaseFilter))
                .then(() => calculator.calculateFor('project', target.projectFilter))
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
