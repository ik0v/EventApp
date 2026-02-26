import "./spinner.css";

type SpinnerProps = {
  size?: number;
};

export default function Spinner({ size = 16 }: SpinnerProps) {
  return (
    <span
      className="spinner"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
