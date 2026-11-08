/** Flattens an intersection for readable hover types (CORE-06). */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};
