import type {
  ClassProp,
  ClassValue,
  OmitUndefined,
  StringToBoolean,
} from "./types";

export type VariantProps<Component extends (...args: any) => any> = Omit<
  OmitUndefined<Parameters<Component>[0]>,
  "class"
>;

const booleanToString = <T extends unknown>(value: T) =>
  typeof value === "boolean" ? `${value}` : value;

/* cx
  ============================================ */

export type CxOptions = ClassValue[];
export type CxReturn = string;

export const cx = <T extends CxOptions>(...classes: T): CxReturn =>
  // @ts-ignore
  classes.flat(Infinity).filter(Boolean).join(" ");

/* cva
  ============================================ */

type ConfigSchema = Record<string, Record<string, ClassValue>>;

type ConfigVariants<T extends ConfigSchema> = {
  [Variant in keyof T]?: StringToBoolean<keyof T[Variant]> | null;
};

type VariantSetSchema<T extends ConfigSchema> = Record<
  string,
  ConfigVariants<T>
>;

type Config<T, S> = T extends ConfigSchema
  ? {
      variants?: T;
      defaultVariants?: ConfigVariants<T>;
      compoundVariants?: (T extends ConfigSchema
        ? ConfigVariants<T> & ClassProp
        : ClassProp)[];
      variantSets?: S extends VariantSetSchema<T> ? S : never;
      defaultVariantSet?: S extends VariantSetSchema<T> ? keyof S : never;
    }
  : never;

type Props<T> = T extends ConfigSchema
  ? ConfigVariants<T> &
      ClassProp & {
        variant?: keyof VariantSetSchema<T>;
      }
  : ClassProp;

export const cva =
  <T, S>(base?: ClassValue, config?: Config<T, S>) =>
  (props?: Props<T>) => {
    const className = props?.class;

    if (config?.variants == null) return cx(base, className);

    const { variants, defaultVariants } = config;

    const getVariantClassNames = Object.keys(variants).map(
      (variant: keyof typeof variants) => {
        const variantProp = props?.[variant as keyof typeof props];
        const defaultVariantProp = defaultVariants?.[variant];

        if (variantProp === null) return null;

        const variantKey = (booleanToString(variantProp) ||
          booleanToString(
            defaultVariantProp
          )) as keyof typeof variants[typeof variant];

        return variants[variant][variantKey];
      }
    );

    const propsWithoutUndefined =
      props &&
      Object.entries(props).reduce((acc, [key, value]) => {
        if (value === undefined) {
          return acc;
        }

        acc[key] = value;
        return acc;
      }, {} as Record<string, unknown>);

    const getCompoundVariantClassNames = config?.compoundVariants?.reduce(
      (acc, { class: classNames, ...compoundVariantOptions }) => {
        if (classNames == null) return acc;

        return Object.entries(compoundVariantOptions).every(
          ([key, value]) =>
            ({
              ...defaultVariants,
              ...propsWithoutUndefined,
            }[key] === value)
        )
          ? [...acc, classNames]
          : acc;
      },
      [] as ClassValue[]
    );

    const getVariantSetClassNames = (variant: keyof S | string | undefined) => {
      const compoundedVariant = variant && config.variantSets?.[variant];

      return compoundedVariant
        ? Object.entries(compoundedVariant).map(([key, value]) => {
            const variantProp = variants?.[key];

            if (variantProp === null) return null;

            const variantKey = booleanToString(value);

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return variants[key]![variantKey];
          })
        : [];
    };

    const defaultCompounded = config?.defaultVariantSet;
    const variantProp = props && "variant" in props && props.variant;

    const variantSetClassNames = getVariantSetClassNames(
      variantProp || defaultCompounded
    );

    return cx(
      base,
      getVariantClassNames,
      getCompoundVariantClassNames,
      variantSetClassNames,
      className
    );
  };
