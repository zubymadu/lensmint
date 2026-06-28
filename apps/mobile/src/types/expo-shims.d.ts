// Type shims for Expo packages until the monorepo upgrades to Expo 52+
// (expo-router requires react-native >= 0.82, scaffold uses 0.74)

declare module "expo-router" {
  import React from "react";
  export function Stack(props: { screenOptions?: object; children?: React.ReactNode }): JSX.Element;
  export namespace Stack {
    function Screen(props: { name?: string; options?: object }): JSX.Element;
  }
  export function Tabs(props: { screenOptions?: object; children?: React.ReactNode }): JSX.Element;
  export function Link(props: { href: string; children?: React.ReactNode }): JSX.Element;
  export const router: {
    push(href: string): void;
    replace(href: string): void;
    back(): void;
  };
  export function useLocalSearchParams<T extends Record<string, string>>(): Partial<T>;
  export function useRouter(): typeof router;
}

declare module "expo-status-bar" {
  import React from "react";
  interface StatusBarProps { style?: "auto" | "inverted" | "light" | "dark"; }
  export function StatusBar(props: StatusBarProps): JSX.Element;
}
