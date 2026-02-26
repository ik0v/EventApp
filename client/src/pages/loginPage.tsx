import NavBar from "../components/navBar";
import LoginButton from "../components/loginButton";
import "./loginPage.css";
import AdminLogin from "../components/adminLogin";

export default function LoginPage() {
  return (
    <div className="login">
      <NavBar />
      <div className="card">
        <h1>EventApp</h1>
        <p className="loginSubtitle">Sign in to discover and create events.</p>
        <LoginButton />
        <AdminLogin />
      </div>
    </div>
  );
}
