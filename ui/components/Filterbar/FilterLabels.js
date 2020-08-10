import ToggleButton from "@material-ui/lab/ToggleButton";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import { makeStyles, withStyles } from "@material-ui/core/styles";
import { Tooltip } from "react-tippy";
import stringToHslColor, { stringToColor } from "../../utils/stringToHslColor";
import { TagIcon } from "components/Icons";

const useStyles = makeStyles((theme) => ({
  toggleButton: {
    padding: theme.spacing(0.7, 2),
    color: "#718096",
    backgroundColor: "#edf2f7",
    "&:hover": {
      backgroundColor: "#e2e8f0",
    },
    borderRadius: "4px !important",
  },
}));

const StyledToggleButtonGroup = withStyles((theme) => ({
  root: {
    background: "none",
  },
  grouped: {
    margin: theme.spacing(0, 1.5),
    height: "auto",
    border: "none",
  },
}))(ToggleButtonGroup);

export default ({ customFields, filterLabels, setFilterLabels }) => {
  if (!customFields) return;

  const classes = useStyles();
  const defaultFilterLabels = customFields.filter(
    (customField) => customField.isShownOnFrontPage
  );

  return (
    <StyledToggleButtonGroup
      value={filterLabels}
      exclusive
      onChange={(event, newSelectedFilter) => {
        setFilterLabels(newSelectedFilter);
      }}
    >
      {defaultFilterLabels.map((customField) => {
        return (
          <ToggleButton
            key={customField.id}
            value={customField}
            className={`${classes.toggleButton}`}
          >
            <Tooltip
              title={`Show the dream's ${customField.name}`}
              position="bottom"
              size="small"
            >
              {customField.name}
            </Tooltip>
          </ToggleButton>
        );
      })}
    </StyledToggleButtonGroup>
  );
};