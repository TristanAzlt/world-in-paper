import chalk from 'chalk';

export function logSuccess(message?: any, ...optionalParams: any[]) {
    console.log(chalk.green.bold('[SUCCESS]') + ' ' + chalk.green(message, ...optionalParams));
}

export function logError(message?: any, ...optionalParams: any[]) {
    console.log(chalk.red.bold('[ERROR]  ') + ' ' + chalk.red(message, ...optionalParams));
}

export function logInfo(message?: any, ...optionalParams: any[]) {
    console.log(chalk.blue.bold('[INFO]   ') + ' ' + chalk.blue(message, ...optionalParams));
}

export function logWarning(message?: any, ...optionalParams: any[]) {
    console.log(chalk.yellow.bold('[WARNING]') + ' ' + chalk.yellow(message, ...optionalParams));
} 