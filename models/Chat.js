import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    question: {
        type: [String],
        default:[]
    },
    answer: {
        type: [String],
        default:[]
    }
}, {
    timestamps: true
});

export default mongoose.model('Chat', chatSchema);