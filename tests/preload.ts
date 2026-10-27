import { setDefaultTimeout } from "bun:test";
import { TIMEOUT } from "@dylanebert/shallot/testing";
import { plugin } from "bun";
import { shallot } from "@dylanebert/shallot/bun";

setDefaultTimeout(TIMEOUT.cheap);
plugin(shallot({ root: import.meta.dir }));
