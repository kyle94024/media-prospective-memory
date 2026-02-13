import ExperimentFlow from "@/components/ExperimentFlow";

// Default experiment route — uses unlimited condition as fallback for dev/testing
export default function ExperimentPage() {
  return <ExperimentFlow condition="unlimited" basePath="/experiment" />;
}
