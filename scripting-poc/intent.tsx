import { Intent, Navigation, Script } from "scripting";

import { AzusaPoCApp } from "./lib/app";

function resolveIntentInput() {
  return (
    Intent.urlsParameter?.[0] ??
    Intent.textsParameter?.[0] ??
    (Intent.shortcutParameter?.type === "text"
      ? Intent.shortcutParameter.value
      : undefined)
  );
}

async function run() {
  const initialInput = resolveIntentInput();

  await Navigation.present({
    element: (
      <AzusaPoCApp
        initialInput={initialInput}
        autoImport={Boolean(initialInput)}
      />
    ),
  });

  Script.exit();
}

void run();
