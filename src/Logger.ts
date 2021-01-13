/*
 * meta2-logger
 *
 * @author Jiri Hybek <jiri@hybek.cz> (https://jiri.hybek.cz/)
 * @copyright 2017 - 2018 Jiří Hýbek
 * @license MIT
 */

import { ILogger, ILoggerTarget, LOG_LEVEL } from "./interfaces";
import { LoggerFacility, ILoggerFacilityConfig } from "./LoggerFacility";

import { ConsoleTarget, IConsoleTargetOptions } from "./ConsoleTarget";
import { MemoryTarget, IMemoryTargetOptions } from "./MemoryTarget";
import { FileTarget, IFileTargetOptions } from "./FileTarget";
import { JsonFileTarget } from "./JsonFileTarget";
import { GraylogTarget, IGraylogTargetOptions } from "./GraylogTarget";

/**
 * Logger configuration
 */
export interface ILoggerConfig {
  level?: LOG_LEVEL;
  trace?: boolean;
  filter?: string;
}

/**
 * Facility Filter
 */
interface IFacilityFilter {
  /** Regular Expression */
  re: RegExp,
  /** Negate regular expression result */
  negate: boolean
};

/**
 * Logger class
 */
export class Logger implements ILogger {

  /** Logging targets */
  protected targets: { [K: string]: ILoggerTarget } = {};

  /** Facility registry */
  protected facilities: { [K: string]: LoggerFacility } = {};

  /** Logger log level */
  protected level: LOG_LEVEL;

  /** If to include callstack */
  protected trace: boolean;

  /** Facilities filters */
  protected filters?: IFacilityFilter[];

  /** Filtered facilities names */
  protected filteredFacilitiesNames: string[];

  /**
   * Logger constructor
   *
   * @param config Logger configuration
   */
  public constructor(config: ILoggerConfig = {}) {

    this.level = config.level || LOG_LEVEL.DEBUG;
    this.trace = config.trace || false;
    this.filters = this.parseFilters(config.filter);

  }

  /**
   * Parses facility filter
   * @param filter 
   */
  protected parseFilters(filters?: string): IFacilityFilter[] {

    if (!filters) {
      return [];
    }

    return filters.split(",").map((expression) => {

      try {

        if (expression === "*") {
          expression = ".*";
        }

        let negate = false;
        if (/^-/.test(expression)) {
          negate = true;
          expression = expression.substring(1);
        }

        return {
          re: new RegExp(expression === "*" ? ".*" : expression),
          negate
        };

      } catch (error) {

        throw new Error(`Invalid regular expression '${expression}'`);

      }

    });

  }

  /**
   * Returns filtered facilities names
   */
  protected filterFacilities(): string[] {

    // Skip if filter wasn't provided
    if (this.filters.length === 0) {
      return [];
    }

    let names = Object.keys(this.facilities);

    this.filters.forEach((filter) => {

      names = names.filter((name) => {

        const match = filter.re.test(name);
        return filter.negate === true ? !match : match;

      });

    });

    return names;

  }

  /**
   * Sets facilities filter
   * @param filters 
   */
  public setFilters(filters: string) {

    this.filters = this.parseFilters(filters);
    this.filteredFacilitiesNames = this.filterFacilities();

  }

  /**
   * Returns facilities filters
   */
  public getFilters() {

    return this.filters;

  }

  /**
   * Returns filtered facilities names
   */
  public getFilteredFacilitiesNames() {

    return this.filteredFacilitiesNames;

  }

  /**
   * Sets log level
   *
   * @param level New log level
   */
  public setLevel(level: LOG_LEVEL) {

    this.level = level;

  }

  /**
   * Returns log level
   */
  public getLevel() {

    return this.level;

  }

  /**
   * Enabled or disabled storing of callstacks
   *
   * @param enabled Enable state
   */
  public enableTrace(enabled: boolean = true) {

    this.trace = enabled;

  }

  /**
   * Return is tracing is enabled
   */
  public isTraceEnabled() {

    return this.trace;

  }

  /**
   * Capture, filter an
   * d return log message stack trace
   */
  public captureStackTrace(prefix: string = ">>\n") {

    const traceObj = { stack: null };
    Error.captureStackTrace(traceObj);

    const lines = traceObj.stack.split("\n");
    const out = [];

    for (let i = 1; i < lines.length; i++)
      if (!lines[i].match(/Logger(Facility)?\.(_log|captureStackTrace)/))
        return prefix + out.concat(lines.splice(i)).join("\n");

    return traceObj.stack;

  }

  /**
   * Internal log method that pass log message to all targets - DO NOT USE DIRECTLY!
   *
   * @internal
   * @param level Log level
   * @param facility Facility
   * @param args Message arguments
   */
  public _log(level: LOG_LEVEL, facility: string, args: any) {

    if (facility === null && level > this.level) return;

    if (
      this.filteredFacilitiesNames &&
      this.filteredFacilitiesNames.length > 0 &&
      !this.filteredFacilitiesNames.includes(facility)) {
      return;
    }

    let meta = {};

    if (args[0] instanceof Object)
      meta = args.shift();

    if (this.trace)
      meta["trace"] = this.captureStackTrace();

    for (const i in this.targets)
      this.targets[i].log.call(this.targets[i], level, facility, args, meta);

  }

  /**
   * Logs message - first argument MUST be log level (from enum = number)
   *
   * Arguments are formatted the same way as the standard console.log() function does.
   *
   * Usage:
   * ```
   * logger.log(LOG_LEVEL.INFO, "Formatted %s message, code %d", "info", 123);
   * ```
   *
   * @param args Message arguments
   */
  public log(...args) {

    const params = Array.prototype.slice.call(args);
    const level = params.shift();

    this._log(level, null, params);

  }

  /**
   * Log DEBUG level message
   *
   * Arguments are formatted the same way as the standard console.log() function does.
   *
   * Usage:
   * ```
   * logger.debug("Formatted %s message, code %d", "debug", 123);
   * ```
   *
   * @param args Message arguments
   */
  public debug(...args) {

    this._log(LOG_LEVEL.DEBUG, null, Array.prototype.slice.call(args));

  }

  /**
   * Log INFO level message
   *
   * Arguments are formatted the same way as the standard console.log() function does.
   *
   * Usage:
   * ```
   * logger.info("Formatted %s message, code %d", "info", 123);
   * ```
   *
   * @param args Message arguments
   */
  public info(...args) {

    this._log(LOG_LEVEL.INFO, null, Array.prototype.slice.call(args));

  }

  /**
   * Log NOTICE level message
   *
   * Arguments are formatted the same way as the standard console.log() function does.
   *
   * Usage:
   * ```
   * logger.notice("Formatted %s message, code %d", "notice", 123);
   * ```
   *
   * @param args Message arguments
   */
  public notice(...args) {

    this._log(LOG_LEVEL.NOTICE, null, Array.prototype.slice.call(args));

  }

  /**
   * Log WARN level message
   *
   * Arguments are formatted the same way as the standard console.log() function does.
   *
   * Usage:
   * ```
   * logger.warn("Formatted %s message, code %d", "warn", 123);
   * ```
   *
   * @param args Message arguments
   */
  public warn(...args) {

    this._log(LOG_LEVEL.WARN, null, Array.prototype.slice.call(args));

  }

  /**
   * Log WARN level message
   *
   * Arguments are formatted the same way as the standard console.log() function does.
   *
   * Usage:
   * ```
   * logger.warning("Formatted %s message, code %d", "warn", 123);
   * ```
   *
   * @param args Message arguments
   */
  public warning(...args) {

    this._log(LOG_LEVEL.WARN, null, Array.prototype.slice.call(args));

  }

  /**
   * Log ERROR level message
   *
   * Arguments are formatted the same way as the standard console.log() function does.
   *
   * Usage:
   * ```
   * logger.error("Formatted %s message, code %d", "error", 123);
   * ```
   *
   * @param args Message arguments
   */
  public error(...args) {

    this._log(LOG_LEVEL.ERROR, null, Array.prototype.slice.call(args));

  }

  /**
   * Log CRITICAL level message
   *
   * Arguments are formatted the same way as the standard console.log() function does.
   *
   * Usage:
   * ```
   * logger.crit("Formatted %s message, code %d", "critical", 123);
   * ```
   *
   * @param args Message arguments
   */
  public crit(...args) {

    this._log(LOG_LEVEL.CRITICAL, null, Array.prototype.slice.call(args));

  }

  /**
   * Log ALERT level message
   *
   * Arguments are formatted the same way as the standard console.log() function does.
   *
   * Usage:
   * ```
   * logger.alert("Formatted %s message, code %d", "alert", 123);
   * ```
   *
   * @param args Message arguments
   */
  public alert(...args) {

    this._log(LOG_LEVEL.ALERT, null, Array.prototype.slice.call(args));

  }

  /**
   * Log EMERGENCY level message
   *
   * Arguments are formatted the same way as the standard console.log() function does.
   *
   * Usage:
   * ```
   * logger.emerg("Formatted %s message, code %d", "emergency", 123);
   * ```
   *
   * @param args Message arguments
   */
  public emerg(...args) {

    this._log(LOG_LEVEL.EMERGENCY, null, Array.prototype.slice.call(args));

  }

  /**
   * Log EMERGENCY level message
   *
   * Arguments are formatted the same way as the standard console.log() function does.
   *
   * Usage:
   * ```
   * logger.panic("Formatted %s message, code %d", "emergency panic", 123);
   * ```
   *
   * @param args Message arguments
   */
  public panic(...args) {

    this._log(LOG_LEVEL.EMERGENCY, null, Array.prototype.slice.call(args));

  }

  /**
   * Create facility logger wrapper
   *
   * @param name Facility name
   * @param config Facility configuration
   */
  public facility(name: string, config: ILoggerFacilityConfig = {}) {

    if (this.facilities[name])
      return this.facilities[name];

    this.facilities[name] = new LoggerFacility(this, name, config);
    this.filteredFacilitiesNames = this.filterFacilities();
    return this.facilities[name];

  }

  /**
   * Return registered facilities
   */
  public getAllFacilities() {

    return this.facilities;

  }

  /**
   * Add logging target
   *
   * @param id Target unique ID
   * @param target Target instance
   */
  public to(id: string, target: ILoggerTarget) {

    this.targets[id] = target;
    return this;

  }

  /**
   * Return all assigned logging targets
   */
  public getAllTargets() {

    return this.targets;

  }

  /**
   * Return target by ID
   *
   * @param id Logging target ID
   */
  public getTarget(id: string) {

    return this.targets[id];

  }

  /**
   * Add console target
   *
   * Overrides existings console target defined previously by this method.
   *
   * Usage:
   *
   * ```
   * logger.toConsole({
   * 	level: LOG_LEVEL.DEBUG,
   * 	timestamp: true,
   * 	facilities: [ "server", "broker" ],
   * 	colorize: true
   * });
   * ```
   *
   * @param options Target options
   */
  public toConsole(options: IConsoleTargetOptions = {}) {

    this.targets["__console__"] = new ConsoleTarget(options);
    return this;

  }

  /**
   * Add memory target
   *
   * Overrides existings memory target defined previously by this method.
   *
   * Usage:
   *
   * ```
   * logger.toMemory({
   * 	level: LOG_LEVEL.DEBUG,
   * 	limit: 1000
   * });
   *
   * logger.getTarget("__memory__").getMessages();
   * ```
   *
   * @param options Target options
   */
  public toMemory(options: IMemoryTargetOptions = {}) {

    this.targets["__memory__"] = new MemoryTarget(options);
    return this;

  }

  /**
   * Add file target
   *
   * Usage:
   *
   * ```
   * logger.toFile("myLogFile.log", {
   * 	level: LOG_LEVEL.DEBUG,
   * 	timestamp: true,
   * 	facilities: [ "server", "broker" ],
   * });
   * ```
   *
   * @param filename Log filename
   * @param options Target options
   */
  public toFile(filename: string, options: IFileTargetOptions = {}) {

    this.targets[filename] = new FileTarget(filename, options);
    return this;

  }

  /**
   * Add JSON file target
   *
   * Usage:
   *
   * ```
   * logger.toJsonFile("myLogFile.json", {
   * 	level: LOG_LEVEL.DEBUG,
   * 	timestamp: true,
   * 	facilities: [ "server", "broker" ],
   * });
   * ```
   *
   * @param filename Log filename
   * @param options Target options
   */
  public toJsonFile(filename: string, options: IFileTargetOptions = {}) {

    this.targets[filename] = new JsonFileTarget(filename, options);
    return this;

  }

  /**
   * Add GrayLog (GELF) target
   *
   * Overrides existings grayLog target defined previously by this method. Use `logger.to()` method to define
   * multiple GrayLog targets.
   *
   * Usage:
   *
   * ```
   * logger.toGrayLog({
   * 	level: LOG_LEVEL.DEBUG,
   * 	facilities: [ "server", "broker" ],
   * 	graylogHostname: "localhost",
   * 	graylogPort: 12201,
   * 	connection: "lan",
   * 	maxChunkSizeWan: 1420,
   * 	maxChunkSizeLan: 8154,
   * 	host: "myApp",
   * 	facilityPrefix: "myAppPrefix_",
   * 	version: "1.0",
   * 	additionalFields: {
   * 		myField: "myValue"
   * 	},
   * 	debugGelfClient: true
   * });
   * ```
   *
   * @param options Target options
   */
  public toGrayLog(options: IGraylogTargetOptions) {

    this.targets["__graylog__"] = new GraylogTarget(options);
    return this;

  }

  /**
   * Close I/O handles of all targets
   */
  public close() {

    for (const i in this.targets)
      this.targets[i].close();

  }

}
