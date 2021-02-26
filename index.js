const {
    targets,
    defaults,
    validateOnly
} = require('./config');
const {info, error} = require('./logger');
const Calculator = require('./Calculator');

targets.reduce((promise, target) => {
    return promise
        .then(() => {
            info(`Starting recalculation for ${target.host}...`);

            const calculator = new Calculator(target);
            let entityTypes = [];
            if (!target.entityTypes || !target.entityTypes.length) {
                entityTypes = defaults.entityTypes;
            } else if (target.entityTypes.length > 0) {
                entityTypes = target.entityTypes.map(et => {
                    let result = {};
                    result.name = et.name;
                    const defaultConfig = defaults.entityTypes.find(e => e.name.toLowerCase() === et.name.toLowerCase());
                    result.filter = et.filter || defaultConfig.filter || 'true';
                    return result;
                });
            }

            if (validateOnly) {
                return entityTypes
                    .reduce((acc, curr) => acc.then(() => calculator.checkFor(curr.name, curr.filter)), Promise.resolve())
                    .then(() => {
                        info(`Validation completed for ${target.host}`);
                    }, err => {
                        error(`Unable to complete validation for ${target.host}`, err);
                    })
            }

            return entityTypes
                .reduce((acc, curr) => acc.then(() => calculator.calculateFor(curr.name, curr.filter)), Promise.resolve())
                .then(() => {
                    info(`Validation completed for ${target.host}`);
                }, err => {
                    error(`Unable to complete validation for ${target.host}`, err);
                })
        });
}, Promise.resolve())
    .then(() => {
        info(`Recalculation completed for ${targets.length} targets\n`);
    });
