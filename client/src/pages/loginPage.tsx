import NavBar from "../components/navBar";
import LoginButton from "../components/loginButton";
import "./loginPage.css";

export default function LoginPage() {
  return (
    <div className="login">
      <NavBar />
      <div className="card">
        <h1>EventApp</h1>
        <LoginButton />
      </div>
    </div>
  );
}
