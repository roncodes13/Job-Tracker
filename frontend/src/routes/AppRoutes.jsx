import { Navigate, Route, Routes } from "react-router";
import AppShell from "../layouts/AppShell.jsx";
import ApplicationDetailPage from "../pages/ApplicationDetailPage.jsx";
import ApplicationFormPage from "../pages/ApplicationFormPage.jsx";
import ApplicationsPage from "../pages/ApplicationsPage.jsx";
import AnalyticsPage from "../pages/AnalyticsPage.jsx";
import ComingSoonPage from "../pages/ComingSoonPage.jsx";
import DashboardPage from "../pages/DashboardPage.jsx";
import InterviewFormPage from "../pages/InterviewFormPage.jsx";
import InterviewListPage from "../pages/InterviewListPage.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import PublicPage from "../pages/PublicPage.jsx";
import RegisterPage from "../pages/RegisterPage.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="applications" element={<ApplicationsPage />} />
          <Route
            path="applications/new"
            element={<ApplicationFormPage mode="create" />}
          />
          <Route
            path="applications/:applicationId"
            element={<ApplicationDetailPage />}
          />
          <Route
            path="applications/:applicationId/edit"
            element={<ApplicationFormPage mode="edit" />}
          />
          <Route path="interviews" element={<InterviewListPage />} />
          <Route
            path="interviews/new"
            element={<InterviewFormPage mode="create" />}
          />
          <Route
            path="interviews/:interviewId/edit"
            element={<InterviewFormPage mode="edit" />}
          />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<ComingSoonPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}
