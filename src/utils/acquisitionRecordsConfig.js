// Creators (YouTube) and Influencers (Instagram) are separate data sets
// with an identical schema — this is the one place that says which
// table and which words ("Subscribers" vs "Followers") go with which.

export const ACQUISITION_RESOURCES = {
  creators: {
    table: "acquisition_creators",
    label: "Creators",
    platform: "YouTube",
    countLabel: "Subscribers",
  },
  influencers: {
    table: "acquisition_influencers",
    label: "Influencers",
    platform: "Instagram",
    countLabel: "Followers",
  },
};
