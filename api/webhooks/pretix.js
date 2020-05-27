const fetch = require('node-fetch');
const { getModels } = require('../database/models');
const { getConnection } = require('../database/connection');

// example request body:
// {
//   "notification_id": 123455,
//   "organizer": "acmecorp",
//   "event": "democon",
//   "code": "ABC23",
//   "action": "pretix.event.order.placed"
// }

module.exports = async (req, res) => {
  const { body } = req;

  switch (body.action) {
    case 'pretix.event.order.paid':
      const pretixRes = await fetch(
        `${process.env.PRETIX_URL}/api/v1/organizers/${body.organizer}/events/${body.event}/orders/${body.code}/`,
        {
          headers: {
            Authorization: `Token ${process.env.PRETIX_TOKEN}`,
          },
        }
      );

      const order = await pretixRes.json();

      if (order.status === 'p') {
        const db = await getConnection();
        const { User, Member, Event } = getModels(db);

        const event = await Event.findOne({ pretixEvent: body.event });

        const attendees = order.positions;

        for (const attendee of attendees) {
          const user = await User.findOneAndUpdate(
            { email: attendee.attendee_email },
            {},
            { setDefaultsOnInsert: true, upsert: true, new: true }
          );

          const membership = await Member.findOneAndUpdate(
            { userId: user.id, eventId: event.id },
            { isApproved: true },
            { setDefaultsOnInsert: true, upsert: true }
          );
          console.log({ user, membership, event });
        }

        res.send(200);
      }
  }
};