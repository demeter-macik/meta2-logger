/*
 * meta2-logger
 *
 * @author Jiri Hybek <jiri@hybek.cz> (https://jiri.hybek.cz/)
 * @copyright 2017 - 2018 Jiří Hýbek
 * @license MIT
 */

import {
  Logger, ILoggerTarget, LOG_LEVEL, LoggerFacility,
  ConsoleTarget, FileTarget, JsonFileTarget, GraylogTarget
} from "../src/index";

describe("Logger class", () => {

  function mockTarget() {

    const target: ILoggerTarget = {
      log: jest.fn(),
      close: jest.fn(),
      setLevel: jest.fn(),
      getLevel: jest.fn()
    };

    return target;

  }

  function mockLoggerWithTarget() {

    const logger = new Logger();
    const target = mockTarget();

    logger.to("trg", target);

    return {
      logger: logger,
      target: target
    };

  }

  it("should construct", () => {

    const logger = new Logger();

    expect(logger).toBeInstanceOf(Logger);

  });

  it("should construct with filters", () => {

    const logger = new Logger({ filters: "*,name,-not" });
    expect(logger.getFilters().toString()).toEqual("/.*/,/name/,/!(not)/");

  });

  it.only("should filter facilities with matching pattern", () => {

    const logger = new Logger({ filters: "*,a" });
    logger.facility("a");
    logger.facility("b");
    logger.facility("c");

    expect(logger.getFilteredFacilities()).toEqual(["a"]);

  });

  it.only("should filter facilities negating pattern", () => {

    const logger = new Logger({ filters: "*,-b" });
    logger.facility("a");
    logger.facility("b");
    logger.facility("c");

    expect(logger.getFilteredFacilities()).toEqual(["a", "c"]);
    
  });

  it("should construct with configuration", () => {

    const logger = new Logger({
      level: LOG_LEVEL.WARN
    });

    expect(logger).toBeInstanceOf(Logger);
    expect(logger.getLevel()).toEqual(LOG_LEVEL.WARN);

  });

  it("should assign logging target(s)", () => {

    const logger = new Logger();
    const target = mockTarget();

    logger.to("trg1", target);
    logger.to("trg2", target);

    expect(logger.getAllTargets()).toEqual({
      trg1: target,
      trg2: target
    });

  });

  it("#getTarget should return target by it's id", () => {

    const logger = new Logger();
    const target = mockTarget();

    logger.to("trg1", target);
    logger.to("trg2", target);

    expect(logger.getTarget("trg1")).toEqual(target);

  });

  it("#_log should pass log message to all targets", () => {

    const logger = new Logger();
    const target = mockTarget();

    logger.to("fn1", target);
    logger.to("fn2", target);

    logger._log(LOG_LEVEL.INFO, "facility", ["arg1", "arg2"]);

    expect(target.log).toHaveBeenCalledTimes(2);
    expect(target.log).toHaveBeenLastCalledWith(LOG_LEVEL.INFO, "facility", ["arg1", "arg2"], {});

  });

  it("#close should call #close method of all targets", () => {

    const logger = new Logger();
    const target = mockTarget();

    logger.to("fn1", target);
    logger.to("fn2", target);

    logger.close();

    expect(target.close).toHaveBeenCalledTimes(2);

  });

  it("#facility should return facility wrapper", () => {

    const logger = new Logger();
    const target = mockTarget();

    logger.to("trg", target);

    const facility = logger.facility("fac");

    // Check facility instance
    expect(facility).toBeInstanceOf(LoggerFacility);

    // Try to log something
    facility.log(LOG_LEVEL.INFO, "arg1", "arg2");

    expect(target.log).toHaveBeenCalledTimes(1);
    expect(target.log).toHaveBeenLastCalledWith(LOG_LEVEL.INFO, "fac", ["arg1", "arg2"], {});

  });

  it("#getFacilities should return registered facilities", () => {

    const logger = new Logger();

    const facilityA = logger.facility("facA");
    const facilityB = logger.facility("facB");

    expect(logger.getAllFacilities()).toEqual({
      facA: facilityA,
      facB: facilityB
    });

  });

  it("#toConsole should assign ConsoleTarget with id of '__console__'", () => {

    const logger = new Logger();

    logger.toConsole({
      level: LOG_LEVEL.DEBUG,
      colorize: true,
    });

    expect(logger.getTarget("__console__")).toBeInstanceOf(ConsoleTarget);

  });

  it("#toFile should assign FileTarget with id of filename", () => {

    const logger = new Logger();

    logger.toFile("test.log", {
      level: LOG_LEVEL.DEBUG
    });

    expect(logger.getTarget("test.log")).toBeInstanceOf(FileTarget);

  });

  it("#toJsonFile should assign JsonTarget with id of filename", () => {

    const logger = new Logger();

    logger.toJsonFile("test.json", {
      level: LOG_LEVEL.DEBUG
    });

    expect(logger.getTarget("test.json")).toBeInstanceOf(JsonFileTarget);

  });

  it("#toGrayLog should assign GraylogTarget with id of '__graylog__'", () => {

    const logger = new Logger();

    logger.toGrayLog({
      level: LOG_LEVEL.DEBUG,
      graylogHostname: "localhost"
    });

    expect(logger.getTarget("__graylog__")).toBeInstanceOf(GraylogTarget);

  });

  it("#log should log message and take first argument as log level", () => {

    const mock = mockLoggerWithTarget();

    mock.logger.log(LOG_LEVEL.INFO, "arg1", "arg2");

    expect(mock.target.log).toHaveBeenLastCalledWith(LOG_LEVEL.INFO, null, ["arg1", "arg2"], {});

  });

  it("#debug should log message with DEBUG level", () => {

    const mock = mockLoggerWithTarget();

    mock.logger.debug("arg1", "arg2");

    expect(mock.target.log).toHaveBeenLastCalledWith(LOG_LEVEL.DEBUG, null, ["arg1", "arg2"], {});

  });

  it("#info should log message with INFO level", () => {

    const mock = mockLoggerWithTarget();

    mock.logger.info("arg1", "arg2");

    expect(mock.target.log).toHaveBeenLastCalledWith(LOG_LEVEL.INFO, null, ["arg1", "arg2"], {});

  });

  it("#notice should log message with NOTICE level", () => {

    const mock = mockLoggerWithTarget();

    mock.logger.notice("arg1", "arg2");

    expect(mock.target.log).toHaveBeenLastCalledWith(LOG_LEVEL.NOTICE, null, ["arg1", "arg2"], {});

  });

  it("#warn should log message with WARN level", () => {

    const mock = mockLoggerWithTarget();

    mock.logger.warn("arg1", "arg2");

    expect(mock.target.log).toHaveBeenLastCalledWith(LOG_LEVEL.WARN, null, ["arg1", "arg2"], {});

  });

  it("#error should log message with ERROR level", () => {

    const mock = mockLoggerWithTarget();

    mock.logger.error("arg1", "arg2");

    expect(mock.target.log).toHaveBeenLastCalledWith(LOG_LEVEL.ERROR, null, ["arg1", "arg2"], {});

  });

  it("#crit should log message with CRITICAL level", () => {

    const mock = mockLoggerWithTarget();

    mock.logger.crit("arg1", "arg2");

    expect(mock.target.log).toHaveBeenLastCalledWith(LOG_LEVEL.CRITICAL, null, ["arg1", "arg2"], {});

  });

  it("#alert should log message with ALERT level", () => {

    const mock = mockLoggerWithTarget();

    mock.logger.alert("arg1", "arg2");

    expect(mock.target.log).toHaveBeenLastCalledWith(LOG_LEVEL.ALERT, null, ["arg1", "arg2"], {});

  });

  it("#emerg should log message with EMERGENCY level", () => {

    const mock = mockLoggerWithTarget();

    mock.logger.emerg("arg1", "arg2");

    expect(mock.target.log).toHaveBeenLastCalledWith(LOG_LEVEL.EMERGENCY, null, ["arg1", "arg2"], {});

  });

  it("#panic should log message with EMERGENCY level", () => {

    const mock = mockLoggerWithTarget();

    mock.logger.panic("arg1", "arg2");

    expect(mock.target.log).toHaveBeenLastCalledWith(LOG_LEVEL.EMERGENCY, null, ["arg1", "arg2"], {});

  });

  it("#setLevel should change log level", () => {

    const mock = mockLoggerWithTarget();

    mock.logger.setLevel(LOG_LEVEL.INFO);

    mock.logger.debug("arg1", "arg2");

    expect(mock.logger.getLevel()).toEqual(LOG_LEVEL.INFO);
    expect(mock.target.log).toHaveBeenCalledTimes(0);

  });

});
