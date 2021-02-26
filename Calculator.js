const {
    defaults
} = require('./config');
const {winston, info, error} = require('./logger');
const ProgressBar = require('progress');
const fetch = require('node-fetch');

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
    constructor({
        pageSize = defaults.pageSize,
        protocol = defaults.protocol,
        host,
        token
    }) {
        this._pageSize = pageSize;
        this._protocol = protocol;
        this._host = host;
        this._token = token;
    }

    calculateFor(entityType, where) {

        if (where.toLowerCase() === 'false') {
            info(`Skipping recalculation for ${entityType}`);
            return Promise.resolve();
        }

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

                info(`Skipping recalculation for ${entityType} because no targets were found`);
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

    checkFor(entityType, where) {
        if (where.toLowerCase() === 'false') {
            info(`Skipping validation for ${entityType}`);
            return Promise.resolve();
        }

        const url = this._getEntitiesCountUrl(entityType, where);

        return fetch(url)
            .then(res => res.json())
            .then(count => {
                if (count > 0) {
                    info(`Starting validation for ${entityType} (count = ${count})...`);

                    const ctx = {
                        progress: createProgressBar(entityType, count),
                        entityType,
                        where
                    };
                    const startedAt = Date.now();

                    return this._checkForPage(ctx)
                        .then(() => {
                            const elapsedSeconds = (Date.now() - startedAt) / 1000;
                            info(`Completed validation for ${entityType} (time = ${elapsedSeconds} s)`)
                        });
                }

                info(`Skipping validation for ${entityType} because no targets were found`);
            }, err => {
                error(`Unable to fetch count for ${entityType} (url="${url}").`, err);
                return Promise.reject(err);
            });
    }

    _checkForPage(ctx, minId = 0) {
        const {progress, entityType, where} = ctx;
        const pageWhere = minId > 0 ? `(${where}) and (id>=${minId})` : where;
        const url = this._getEntityIdsUrl(entityType, pageWhere);

        return fetch(url)
            .then(res => res.json())
            .then(json => {
                if (json.items.length) {
                    const ids = json.items.map(item => item.id);
                    const targets = ids.map(id => ({id, entityType}));

                    return this._checkMetricsForTargets(targets)
                        .then(report => {
                            const reportInconsistentOnly = {
                                reports: report.reports.map(r => ({
                                    id: r.id,
                                    entityType: r.entityType,
                                    inconsistentFields: r.inconsistentFields
                                }))
                            };
                            if (any(report.reports, r => r.inconsistentFields && r.inconsistentFields.length)) {
                                winston.warn('CheckAllMetrics response: Some entities are in inconsistent state.', JSON.stringify(reportInconsistentOnly));
                            } else {
                                winston.info('CheckAllMetrics response: All entities are valid.', JSON.stringify(reportInconsistentOnly));
                            }

                            progress.tick(ids.length);

                            const maxId = Math.max(...ids);
                            return this._checkForPage(ctx, maxId + 1);
                        });
                }
            }, err => {
                error(`Unable to fetch ids for ${entityType} (url="${url}").`, err);
                return Promise.reject(err);
            });
    }

    _checkMetricsForTargets(targets) {
        const payload = JSON.stringify({targets});
        const options = {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: payload
        };
        const url = this._getCheckAllMetricsUrl();

        return fetch(url, options)
            .then(res => res.json(), err => {
                error(`Unable to validation all metrics for ${targets.length} targets (url)`, err);
            });
    }

    _getEntitiesCountUrl(entityType, where) {
        return `${this._protocol}://${this._host}/api/v2/${entityType}?token=${this._token}&where=(${where})&result=count`;
    }

    _getEntityIdsUrl(entityType, where) {
        return `${this._protocol}://${this._host}/api/v2/${entityType}?token=${this._token}&select={id}&where=(${where})&orderby=id&take=${this._pageSize}`;
    }

    _getCalculateAllMetricsUrl() {
        return `${this._protocol}://${this._host}/api/MetricSetup/v1/iWantToDangerouslyCalculateAllMetricsAndPossiblyDieFromPerformanceConsequencesFor?token=${this._token}`;
    }

    _getCheckAllMetricsUrl() {
        return `${this._protocol}://${this._host}/api/MetricSetup/v1/iWantToDangerouslyCheckAllMetricsConsistencyAndPossiblyDieFromPerformanceConsequencesFor?token=${this._token}`;
    }
}

module.exports = Calculator;
