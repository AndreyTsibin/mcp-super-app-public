export type Profile = "S" | "M" | "L";

/** Everything the generators need to materialize a project skeleton. */
export interface BootstrapContext {
  /** Absolute path of the target project directory. */
  projectPath: string;
  name: string;
  profile: Profile;
  /** Free-text stack description (drives .gitignore / permissions). */
  stack: string;
  /** 1–2 sentences: what we're building (goes into product-vision). */
  vision: string;
}
