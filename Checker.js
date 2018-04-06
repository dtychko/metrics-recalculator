const {
    defaults
} = require('./config');
const {winston, info, error} = require('./logger');
const ProgressBar = require('progress');
const fetch = require('node-fetch');

function sum(values, fn) {
    return values.reduce((acc, val) => {
        return acc + (fn ? fn(val) : val);
    }, 0);
}

function createProgressBar(entityType, count) {
    return new ProgressBar(`${entityType} :current/:total [:bar] :percent time remaining: :etas`, {
        width: 50,
        total: count
    });
}

function getDefaultWhere(entityType) {
    return defaults[`${entityType}Filter`] || 'true';
}

class Checker {
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

    checkFor(entityType, where) {
        where = where || getDefaultWhere(entityType);

        if (where.toLowerCase() === 'false') {
            info(`Skipping check for ${entityType}`);
            return Promise.resolve();
        }

        const url = this._getEntitiesCountUrl(entityType, where);

        return fetch(url)
            .then(res => res.json())
            .then(count => {
                if (count > 0) {
                    info(`Starting checking for ${entityType} (count = ${count})...`);

                    const ctx = {
                        progress: createProgressBar(entityType, count),
                        entityType,
                        where
                    };
                    const startedAt = Date.now();

                    return this._checkForPage(ctx)
                        .then(report => {
                            const elapsedSeconds = (Date.now() - startedAt) / 1000;
                            info(`Completed check for ${entityType} (time = ${elapsedSeconds} s).`, JSON.stringify(report));
                        });
                }

                info(`Skipping check for ${entityType} because no targets were found`);
            }, err => {
                error(`Unable to fetch count for ${entityType} (url="${url}").`, err);
                return Promise.reject(err);
            });
    }

    _checkForPage(ctx, report = {totalErrors: 0, totalInconsistentFields: 0, totalInconsistentEntities: 0}, minId = 0) {
        const {progress, entityType, where} = ctx;
        const pageWhere = minId > 0 ? `(${where}) and (id>=${minId})` : where;
        const url = this._getEntityIdsUrl(entityType, pageWhere);

        return fetch(url)
            .then(res => res.json())
            .then(json => {
                if (json.items.length) {
                    const targets = json.items.map(item => ({id: item.id, entityType: item.entityType}));
                    const ids = targets.map(target => target.id);

                    return this._checkMetricsForTargets(targets)
                        .then(result => {
                            const errorCount = sum(result.reports, r => ((r.errors || []).length));
                            const inconsistentFieldCount = sum(result.reports, r => ((r.inconsistentFields || []).length));
                            const inconsistentEntityCount = sum(result.reports, r => ((r.inconsistentFields || []).length ? 1 : 0));

                            if (errorCount) {
                                // winston.error('CheckAllMetrics response: Some metrics check was failed.', JSON.stringify(result));
                            } else if (inconsistentFieldCount) {
                                // winston.warn('CheckAllMetrics response: Some entities are in inconsistent state.', JSON.stringify(result));
                            } else {
                                // winston.info('CalculateAllMetrics response: All entities are in consistent state.', JSON.stringify(result));
                            }

                            const errors = result.reports.filter(r => ((r.errors || []).length));
                            errors.forEach(r => {
                                winston.warn(`Failed check of entity ${r.entityType}#${r.id} (${r.errors.length} errors).`, JSON.stringify(r));
                            });

                            const inconsistentEntities = result.reports.filter(r => ((r.inconsistentFields || []).length));
                            inconsistentEntities.forEach(r => {
                                winston.warn(`Inconsistent entity ${r.entityType}#${r.id} (${r.inconsistentFields.length} field(s)).`, JSON.stringify(r));
                            });

                            progress.tick(ids.length);

                            const maxId = Math.max(...ids);
                            return this._checkForPage(
                                ctx,
                                {
                                    totalErrors: report.totalErrors + errorCount,
                                    totalInconsistentFields: report.totalInconsistentFields + inconsistentFieldCount,
                                    totalInconsistentEntities: report.totalInconsistentEntities + inconsistentEntityCount
                                },
                                maxId + 1);
                        });
                }

                return report;
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
                error(`Unable to check all metrics for ${targets.length} targets (url)`, err);
            });
    }

    _getEntitiesCountUrl(entityType, where) {
        return `${this._protocol}://${this._host}/api/v2/${entityType}?token=${this._token}&where=(${where})&result=count`;
    }

    _getEntityIdsUrl(entityType, where) {
        return `${this._protocol}://${this._host}/api/v2/${entityType}?token=${this._token}&select={id,entityType:entityType.name}&where=(${where})&orderby=id&take=${this._pageSize}`;
    }

    _getCheckAllMetricsUrl() {
        return `${this._protocol}://${this._host}/api/MetricSetup/v1/iWantToDangerouslyCheckAllMetricsConsistencyAndPossiblyDieFromPerformanceConsequencesFor?token=${this._token}`;
    }
}

module.exports = Checker;
