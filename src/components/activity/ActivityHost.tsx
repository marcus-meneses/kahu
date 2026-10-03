import { Fragment, lazy, Suspense } from "react";
import { Loader } from "@mantine/core";
import { NavigationFrame, useNavigationStack } from "../../classes/contexts/NavigationStackContext";

const TutorForm = lazy(() => import("../tutorform/TutorForm"));
const AnimalForm = lazy(() => import("../animalform/AnimalForm"));
const ImpersonationModal = lazy(() => import("../impersonation/ImpersonationModal"));

function Activity({ frame, layer }: { frame: NavigationFrame; layer: number }) {
  if (!frame.activity) return null;
  if (frame.activity.type === "impersonation.select") return <ImpersonationModal activityFrame={frame} activityLayer={layer} />;
  if (frame.activity.type.startsWith("tutor.")) return <TutorForm activityFrame={frame} activityLayer={layer} />;
  if (frame.activity.type.startsWith("animal.")) return <AnimalForm activityFrame={frame} activityLayer={layer} />;
  return null;
}

export function ActivityHost() {
  const { frames } = useNavigationStack();
  const activities = frames.filter((frame) => frame.activity);

  if (!activities.length) return null;

  return (
    <Suspense fallback={<Loader style={{ position: "fixed", inset: "50% auto auto 50%", zIndex: 2000 }} />}>
      {activities.map((frame, index) => <Fragment key={frame.id}><Activity frame={frame} layer={1000 + index * 100} /></Fragment>)}
    </Suspense>
  );
}
