/*
 * To disable recalculation for {entityType} use
 *     targets: [
 *         {
 *             entityTypes: [
                {name: '{entityType}', filter: 'false'},
                .....
                ]
 *         }
 *     ]
 *
 * To set custom recalculation filter {filter} for {entityType} use
 *     targets: [
 *         {
 *             entityTypes: [
                {name: '{entityType}', filter: '{filter}'},
                .....
                ]
 *         }
 *     ]
 * where {filter} is any valid DSL filter for {entityType}, e.g. 'userstories.count==0 and project.isactive==true' for feature.
 * if target entityTypes collection is empty or undefined then entityTypes from defaults are used.
 */

module.exports = {
    /**
     * when this flag is true recalculator only validates consistency and does not schedule recalculation
     */
    validateOnly: true,
    defaults: {
        pageSize: 200,
        protocol: 'https',
        entityTypes: [
            {
                name: 'roleeffort', filter: 'false'
            }, {
                name: 'task', filter: 'false'
            }, {
                name: 'bug', filter: 'false'
            }, {
                name: 'userstory', filter: 'false'
            }, {
                name: 'request', filter: 'false'
            }, {
                name: 'feature', filter: 'false'
            }, {
                name: 'epic', filter: 'false'
            }, {
                name: 'portfolioepic', filter: 'false'
            }, {
                name: 'iteration', filter: 'false'
            }, {
                name: 'teamiteration', filter: 'false'
            }, {
                name: 'release', filter: 'false'
            }, {
                name: 'project', filter: 'false'
            }
        ]
    },
    targets: [
        {
            host: '{account}.tpondemand.com',
            token: '',
            entityTypes: [            
            ]
        }
    ]
};
