import {
  isString,
  isNumber,
  isBoolean,
  isDate,
  isObject,
  isStringArray,
  isNumberArray,
  isNonEmptyString,
  isPositiveInteger,
  isNonNegativeInteger,
  isValidEmail,
  isValidUrl,
} from "../typeGuards";

describe("typeGuards", () => {
  describe("isString", () => {
    it("should return true for string values", () => {
      expect(isString("hello")).toBe(true);
      expect(isString("")).toBe(true);
      expect(isString("123")).toBe(true);
    });

    it("should return false for non-string values", () => {
      expect(isString(123)).toBe(false);
      expect(isString(true)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString([])).toBe(false);
    });
  });

  describe("isNumber", () => {
    it("should return true for valid numbers", () => {
      expect(isNumber(123)).toBe(true);
      expect(isNumber(0)).toBe(true);
      expect(isNumber(-123)).toBe(true);
      expect(isNumber(123.45)).toBe(true);
    });

    it("should return false for invalid numbers", () => {
      expect(isNumber(NaN)).toBe(false);
      expect(isNumber(Infinity)).toBe(false);
      expect(isNumber(-Infinity)).toBe(false);
      expect(isNumber("123")).toBe(false);
      expect(isNumber(null)).toBe(false);
      expect(isNumber(undefined)).toBe(false);
    });
  });

  describe("isBoolean", () => {
    it("should return true for boolean values", () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
    });

    it("should return false for non-boolean values", () => {
      expect(isBoolean(0)).toBe(false);
      expect(isBoolean(1)).toBe(false);
      expect(isBoolean("true")).toBe(false);
      expect(isBoolean(null)).toBe(false);
      expect(isBoolean(undefined)).toBe(false);
    });
  });

  describe("isDate", () => {
    it("should return true for valid dates", () => {
      expect(isDate(new Date())).toBe(true);
      expect(isDate(new Date("2023-01-01"))).toBe(true);
    });

    it("should return false for invalid dates", () => {
      expect(isDate(new Date("invalid"))).toBe(false);
      expect(isDate("2023-01-01")).toBe(false);
      expect(isDate(123)).toBe(false);
      expect(isDate(null)).toBe(false);
      expect(isDate(undefined)).toBe(false);
    });
  });

  describe("isObject", () => {
    it("should return true for objects", () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: "value" })).toBe(true);
      expect(isObject(new Date())).toBe(true);
    });

    it("should return false for non-objects", () => {
      expect(isObject(null)).toBe(false);
      expect(isObject([])).toBe(false);
      expect(isObject("string")).toBe(false);
      expect(isObject(123)).toBe(false);
      expect(isObject(undefined)).toBe(false);
    });
  });

  describe("isStringArray", () => {
    it("should return true for string arrays", () => {
      expect(isStringArray(["a", "b", "c"])).toBe(true);
      expect(isStringArray([])).toBe(true);
    });

    it("should return false for non-string arrays", () => {
      expect(isStringArray([1, 2, 3])).toBe(false);
      expect(isStringArray(["a", 1, "c"])).toBe(false);
      expect(isStringArray("string")).toBe(false);
      expect(isStringArray(null)).toBe(false);
    });
  });

  describe("isNumberArray", () => {
    it("should return true for number arrays", () => {
      expect(isNumberArray([1, 2, 3])).toBe(true);
      expect(isNumberArray([])).toBe(true);
    });

    it("should return false for non-number arrays", () => {
      expect(isNumberArray(["a", "b", "c"])).toBe(false);
      expect(isNumberArray([1, "a", 3])).toBe(false);
      expect(isNumberArray("string")).toBe(false);
      expect(isNumberArray(null)).toBe(false);
    });
  });

  describe("isNonEmptyString", () => {
    it("should return true for non-empty strings", () => {
      expect(isNonEmptyString("hello")).toBe(true);
      expect(isNonEmptyString("a")).toBe(true);
    });

    it("should return false for empty strings and non-strings", () => {
      expect(isNonEmptyString("")).toBe(false);
      expect(isNonEmptyString(123)).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
    });
  });

  describe("isPositiveInteger", () => {
    it("should return true for positive integers", () => {
      expect(isPositiveInteger(1)).toBe(true);
      expect(isPositiveInteger(100)).toBe(true);
    });

    it("should return false for non-positive integers and non-integers", () => {
      expect(isPositiveInteger(0)).toBe(false);
      expect(isPositiveInteger(-1)).toBe(false);
      expect(isPositiveInteger(1.5)).toBe(false);
      expect(isPositiveInteger("1")).toBe(false);
      expect(isPositiveInteger(null)).toBe(false);
    });
  });

  describe("isNonNegativeInteger", () => {
    it("should return true for non-negative integers", () => {
      expect(isNonNegativeInteger(0)).toBe(true);
      expect(isNonNegativeInteger(1)).toBe(true);
      expect(isNonNegativeInteger(100)).toBe(true);
    });

    it("should return false for negative integers and non-integers", () => {
      expect(isNonNegativeInteger(-1)).toBe(false);
      expect(isNonNegativeInteger(1.5)).toBe(false);
      expect(isNonNegativeInteger("1")).toBe(false);
      expect(isNonNegativeInteger(null)).toBe(false);
    });
  });

  describe("isValidEmail", () => {
    it("should return true for valid emails", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name@domain.co.jp")).toBe(true);
      expect(isValidEmail("a@b.c")).toBe(true);
    });

    it("should return false for invalid emails", () => {
      expect(isValidEmail("invalid-email")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
      expect(isValidEmail("test@")).toBe(false);
      expect(isValidEmail("test.example.com")).toBe(false);
      expect(isValidEmail("")).toBe(false);
      expect(isValidEmail(123)).toBe(false);
    });
  });

  describe("isValidUrl", () => {
    it("should return true for valid URLs", () => {
      expect(isValidUrl("https://example.com")).toBe(true);
      expect(isValidUrl("http://example.com")).toBe(true);
      expect(isValidUrl("https://example.com/path")).toBe(true);
    });

    it("should return false for invalid URLs", () => {
      expect(isValidUrl("not-a-url")).toBe(false);
      expect(isValidUrl("example.com")).toBe(false);
      expect(isValidUrl("")).toBe(false);
      expect(isValidUrl(123)).toBe(false);
    });
  });
});

