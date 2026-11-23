import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { SaveInquiryDto, SubmitInquiryDto } from "../src/inquiries/inquiry.dto.js";
const fields = {
  kind: "individual",
  name: "Customer",
  company: "",
  destination: "Nablus",
  phone: "",
  notes: "",
};
const item = { productId: "ghazal", packageId: null, quantity: 2, unit: "kg", requirements: "" };
test("inquiry DTOs bound nested items and reject privilege, history and snapshot injection", async () => {
  const dto = { revision: 1, lang: "ar", fields, items: [item] };
  const check = (input: object) =>
    validate(plainToInstance(SaveInquiryDto, input), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
  assert.equal((await check(dto)).length, 0);
  for (const patch of [
    { userId: "other" },
    { status: "submitted" },
    { history: [] },
    { fields: undefined },
    { items: [{ ...item, snapshot: { name: "fake" } }] },
    { items: [{ ...item, quantity: 0 }] },
    { items: [{ ...item, quantity: 1000001 }] },
    { items: Array(31).fill(item) },
    { revision: 1.5 },
    { lang: "de" },
    { fields: { ...fields, notes: "x".repeat(3001) } },
  ])
    assert.ok((await check({ ...dto, ...patch })).length > 0);
  assert.ok(
    (await validate(plainToInstance(SubmitInquiryDto, { key: "not-uuid", revision: 1 }))).length >
      0,
  );
});
