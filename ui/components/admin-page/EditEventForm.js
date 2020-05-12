import useForm from "react-hook-form";
import gql from "graphql-tag";
import { useMutation } from "@apollo/react-hooks";
import { TextField, Box, InputAdornment, Button } from "@material-ui/core";
import SelectInput from "../SelectInput";

import slugify from "../../utils/slugify";

const EDIT_EVENT = gql`
  mutation editEvent(
    $eventId: ID!
    $slug: String
    $title: String
    $registrationPolicy: RegistrationPolicy
  ) {
    editEvent(
      eventId: $eventId
      slug: $slug
      title: $title
      registrationPolicy: $registrationPolicy
    ) {
      id
      title
      slug
      registrationPolicy
    }
  }
`;

export default ({ event }) => {
  const [editEvent] = useMutation(EDIT_EVENT);

  const { handleSubmit, register, setValue, formState, errors } = useForm();

  return (
    <>
      <h2 className="text-2xl">Edit event</h2>
      <form
        onSubmit={handleSubmit((variables) => {
          editEvent({
            variables: {
              ...variables,
              eventId: event.id,
              totalBudget: Number(variables.totalBudget),
              grantValue: Number(variables.grantValue),
              grantsPerMember: Number(variables.grantsPerMember),
            },
          })
            .then((data) => {
              // Add "Snackbar" success message from material UI
            })
            .catch((error) => {
              alert(error.message);
            });
        })}
      >
        <Box maxWidth={500}>
          <Box my={2}>
            <TextField
              name="title"
              label="Title"
              defaultValue={event.title}
              variant="outlined"
              fullWidth
              inputRef={register}
            />
          </Box>
          <Box my={2}>
            <TextField
              name="slug"
              label="Slug"
              defaultValue={event.slug}
              fullWidth
              inputRef={register}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">.dreams.wtf</InputAdornment>
                ),
                onBlur: (e) => {
                  setValue("slug", slugify(e.target.value));
                },
              }}
              variant="outlined"
            />
          </Box>
          <Box my={2}>
            <SelectInput
              name="registrationPolicy"
              label="Registration policy"
              defaultValue={event.registrationPolicy}
              inputRef={register}
              fullWidth
            >
              <option value="OPEN">Open</option>
              <option value="REQUEST_TO_JOIN">Request to join</option>
              <option value="INVITE_ONLY">Invite only</option>
            </SelectInput>
          </Box>
          <Box my={2}>
            <Button
              type="submit"
              size="large"
              variant="contained"
              color="primary"
            >
              Save
            </Button>
          </Box>
        </Box>
      </form>
    </>
  );
};
