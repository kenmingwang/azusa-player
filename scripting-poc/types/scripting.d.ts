declare module "scripting" {
  export const Navigation: any;
  export const NavigationStack: any;
  export const Script: any;
  export const Intent: any;
  export const Button: any;
  export const Text: any;
  export const TextField: any;
  export const Form: any;
  export const Section: any;
  export const HStack: any;
  export const VStack: any;
  export const Spacer: any;
  export const Path: any;
  export const FileManager: any;
  export const Storage: any;
  export const BackgroundURLSession: any;
  export const AVPlayer: any;
  export const SharedAudioSession: any;
  export const MediaPlayer: any;
  export const TimeControlStatus: any;
  export const useEffect: any;
  export const useMemo: any;
  export const useState: any;
}

declare namespace JSX {
  interface Element {}
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
