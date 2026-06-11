import { Toaster as Sonner } from "sonner";

const Toaster = (props: React.ComponentProps<typeof Sonner>) => (
  <Sonner
    theme="dark"
    position="top-center"
    toastOptions={{
      style: {
        background: "#1b1712",
        border: "1px solid rgba(229,180,91,0.18)",
        color: "#f2ead9",
        borderRadius: "0.75rem",
        fontFamily: "'Schibsted Grotesk Variable', sans-serif",
        fontSize: "13.5px",
        boxShadow: "0 16px 40px -16px rgba(0,0,0,0.8)",
      },
    }}
    {...props}
  />
);

export { Toaster };
