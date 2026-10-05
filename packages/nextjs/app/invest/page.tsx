import type { NextPage } from "next";
import { InvestorPortal } from "~~/components/atollway/invest/InvestorPortal";
import { getMetadata } from "~~/utils/scaffold-hbar/getMetadata";

export const metadata = getMetadata({
  title: "Invest",
  description: "Subscribe for shares with HBAR and hold them on any chain.",
});

const Invest: NextPage = () => {
  return <InvestorPortal />;
};

export default Invest;
