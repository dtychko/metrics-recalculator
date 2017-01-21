const {
    pageSize,
    targets
} = require('./config');
const winston = require('winston');
const fetch = require('node-fetch');
const ProgressBar = require('progress');

winston.configure({
    transports: [
        new winston.transports.File({
            filename: 'index.log',
            level: 'info',
            maxsize: 10 * 1024 * 1024,
            json: false
        })
    ]
});

function info(message) {
    console.log(message);
    winston.info(message);
}

function error(message, err) {
    console.error(message, err);
    winston.error(message, err)
}

function any(values, fn) {
    for (let i = 0; i < values.length; i++) {
        if (fn(values[i])) {
            return true;
        }
    }

    return false;
}

function createProgressBar(entityType, count) {
    return new ProgressBar(`${entityType} :current/:total [:bar] :percent time remaining: :etas`, {
        width: 50,
        total: count
    });
}

class Calculator {
    constructor(protocol, host, token) {
        this._protocol = protocol;
        this._host = host;
        this._token = token;
    }

    calculateFor(entityType, where = 'true') {
        const url = this._getEntitiesCountUrl(entityType, where);

        return fetch(url)
            .then(res => res.json())
            .then(count => {
                if (count > 0) {
                    info(`Starting recalculation for ${entityType} (count = ${count})...`);

                    const ctx = {
                        progress: createProgressBar(entityType, count),
                        entityType,
                        where
                    };
                    const startedAt = Date.now();

                    return this._calculateForPage(ctx)
                        .then(() => {
                            const elapsedSeconds = (Date.now() - startedAt) / 1000;
                            info(`Completed recalculation for ${entityType} (time = ${elapsedSeconds} s)`)
                        });
                }
            }, err => {
                error(`Unable to fetch count for ${entityType} (url="${url}").`, err);
                return Promise.reject(err);
            });
    }

    _calculateForPage(ctx, minId = 0) {
        const {progress, entityType, where} = ctx;
        const pageWhere = minId > 0 ? `(${where}) and (id>=${minId})` : where;
        const url = this._getEntityIdsUrl(entityType, pageWhere);

        return fetch(url)
            .then(res => res.json())
            .then(json => {
                if (json.items.length) {
                    const ids = json.items.map(item => item.id);
                    const targets = ids.map(id => ({id, entityType}));

                    return this._calculateMetricsForTargets(targets)
                        .then(report => {
                            if (any(report.reports, r => r.failedMetrics && r.failedMetrics.length)) {
                                winston.warn('CalculateAllMetrics response: Some metrics execution was failed.', JSON.stringify(report));
                            } else {
                                winston.info('CalculateAllMetrics response: All metrics were executed successfully.', JSON.stringify(report));
                            }

                            progress.tick(ids.length);

                            const maxId = Math.max(...ids);
                            return this._calculateForPage(ctx, maxId + 1);
                        });
                }
            }, err => {
                error(`Unable to fetch ids for ${entityType} (url="${url}").`, err);
                return Promise.reject(err);
            });
    }

    _calculateMetricsForTargets(targets) {
        const payload = JSON.stringify({targets});
        const options = {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: payload
        };
        const url = this._getCalculateAllMetricsUrl();

        return fetch(url, options)
            .then(res => res.json(), err => {
                error(`Unable to calculate all metrics for ${targets.length} targets (url)`, err);
            });
    }

    _getEntitiesCountUrl(entityType, where) {
        return `${this._protocol}://${this._host}/api/v2/${entityType}?token=${this._token}&where=(${where})&result=count`;
    }

    _getEntityIdsUrl(entityType, where) {
        return `${this._protocol}://${this._host}/api/v2/${entityType}?token=${this._token}&select={id}&where=(${where})&orderby=id&take=${pageSize}`;
    }

    _getCalculateAllMetricsUrl() {
        return `${this._protocol}://${this._host}/api/MetricSetup/v1/iWantToDangerouslyCalculateAllMetricsAndPossiblyDieFromPerformanceConsequencesFor?token=${this._token}`;
    }
}

targets.reduce((promise, {protocol = 'https', host, token}) => {
    return promise
        .then(() => {
            info(`Starting recalculation for ${host}...`);

            const calculator = new Calculator(protocol, host, token);

            return Promise.resolve()
                .then(() => calculator.calculateFor('userstory'))
                .then(() => calculator.calculateFor('feature', 'userstories.count==0'))
                .then(() => calculator.calculateFor('epic', 'features.count==0'))
                .then(() => calculator.calculateFor('request'))
                .then(() => {
                    info(`Recalculation completed for ${host}`);
                }, err => {
                    error(`Unable to complete recalculation for ${host}`, err);
                });
        });
}, Promise.resolve())
    .then(() => {
        info(`Recalculation completed for ${targets.length} targets\n`);
    });
