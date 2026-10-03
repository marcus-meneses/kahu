import { lazy, ReactElement, useMemo } from "react";
import { Navigate } from "react-router-dom";
import layoutClasses from "../css/main.module.css";

const UserForm = lazy(() => import("../components/userform/UserForm"));
//const CustomerForm = lazy(() => import("../components/customerform/CustomerForm"));
const AnimalForm = lazy(() => import("../components/animalform/AnimalForm"));
const ServiceKanban = lazy(() => import("../components/servicekanban/ServiceKanban"));
const Storefront = lazy(() => import("../components/storefront/Storefront"));
const StockModule = lazy(() => import("../components/stock/StockModule"));
const TutorForm = lazy(() => import("../components/tutorform/TutorForm"));
//const AnimalDash = lazy(() => import("../components/animalDash/AnimalDash"));
const Schedule = lazy(() => import("../components/schedule/Schedule"));
const ScheduleMonth = lazy(() => import("../components/schedulemonth/ScheduleMonth"));
const ButtonShowcase = lazy(() => import("../components/buttonshowcase/ButtonShowcase"));
const DashboardHome = lazy(() => import("../components/dashboard/Dashboard"));
const PresaleTracking = lazy(() => import("../components/presaletracking/PresaleTracking"));


const resolveSection = (section: string): ReactElement => {
  switch (section) {
    case "":
    case "dash":
      return <DashboardHome />;
    case "main":
      return <PresaleTracking />;
    case "user":
    case "users":
      return <UserForm />;
    case "customer":
    case "customers":
      return <ScheduleMonth />;
    case "shop":
    case "storefront":
      return <Storefront />;
    case "inventory":
    case "stock":
      return <StockModule />;
    case "animal":
    case "animals":
      return <AnimalForm />;
    case "vet":
      return <Schedule />;
    case "veterinary":
    case "veterinaria":
      return <ServiceKanban module="veterinary" />;
    case "product":
    case "products":
      return <Storefront initialMode="products" />;
    case "service":
    case "services":
      return <Storefront initialMode="services" />;
    case "grooming":
      return <ServiceKanban module="grooming" />;
    case "hotel":
      return <ServiceKanban module="hotel" />;
    case "tutor":
    case "tutors":
      return <TutorForm />;
    case "button-showcase":
    case "buttons":
      return <ButtonShowcase />;
    default:
      return <Navigate to="/notfound" replace />;
  }
};

function DashBoard({ section, action = "" }: { section: string; action?: string }) {
  //const userContext = useContext(UserContext) as UserContextInterface;

  const innerSection = useMemo(() => section, [section, action]);
  return (
    <div className="App">
      <div className={layoutClasses.moduleArea}>
        {resolveSection(innerSection)}
      </div>
    </div>
  );
}

export default DashBoard;
