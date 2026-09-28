import { plugin } from "bun";
import { shallot } from "@dylanebert/shallot/bun";

plugin(shallot({ root: import.meta.dir }));
