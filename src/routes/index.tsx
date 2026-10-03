import { useParams } from "react-router-dom";
import DashBoard from "./dashboard";

export default function Index() {
  const { section = "", action = "" } = useParams();
  return <DashBoard section={section} action={action} />;
}
