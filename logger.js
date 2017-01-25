const winston = require('winston');

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

module.exports = {
    winston,
    info,
    error
};
