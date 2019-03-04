/*
 * To disable recalculation for {entityType} use
 *     targets: [
 *         {
 *             {entityType}Filter: 'false',
 *             ...
 *         }
 *     ]
 *
 * To set custom recalculation filter {filter} for {entityType} use
 *     targets: [
 *         {
 *             {entityType}Filter: {filter},
 *             ...
 *         }
 *     ]
 * where {filter} is any valid DSL filter for {entityType}, e.g. 'userstories.count==0 and project.isactive==true' for feature.
 *
 * Supported entity types for recalculation:
 *     - task
 *     - user story
 *     - feature
 *     - epic
 *     - request
 */

module.exports = {
    defaults: {
        pageSize: 200,
        protocol: 'https',
        roleEffortFilter: 'false',
        taskFilter: 'false',
        bugFilter: 'false',
        userStoryFilter: 'false',
        requestFilter: 'false',
        featureFilter: 'false',
        epicFilter: 'false',
        portfolioEpicFilter: 'false',
        iterationFilter: 'false',
        teamIterationFilter: 'false',
        releaseFilter: 'false',
        projectFilter: 'false'
    },
    targets: [
        {
            host: '{account}.tpondemand.com',
            token: '{token}'
        }
    ]
};
