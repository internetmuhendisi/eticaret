"use client";
import { IskeletGorunum } from "../../../bilesenler/parcalar/iskelet";

export function IskeletOrnegi() {
  return (
    <div className="flex flex-col gap-2">
      <IskeletGorunum className="h-6 w-1/2" />
      <IskeletGorunum className="h-20 w-full" />
    </div>
  );
}
