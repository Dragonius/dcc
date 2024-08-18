
local logName = 'DCS.JS.CSAR'
local function debugLog(message) log.write(logName, log.INFO, tostring(message)) end

local function printObj(obj, hierarchyLevel) 
    if (hierarchyLevel == nil) then
        hierarchyLevel = 0
    elseif (hierarchyLevel == 4) then
        return 0
    end
    
    local whitespace = ""
    for i=0,hierarchyLevel,1 do
        whitespace = whitespace .. "-"
    end
    
    debugLog(obj)
    if (type(obj) == "table") then
        for k,v in pairs(obj) do
        io.write(whitespace .. "-")
        if (type(v) == "table") then
            printObj(v, hierarchyLevel+1)
        else
            debugLog(v)
        end           
        end
    else
        debugLog(obj)
    end
end

local smokeColor = 4

local landedPickUpRange = 150
local hoverPickUpRange = 150
local notificationPickUpRange = 2000
local landedDropOffRange = 150

DCSAR = {}

function DCSAR:New(groupId, groupName, heliName, pilotGroupName, pilotName, dropOffLocation)
    local flightGroup = {}
    flightGroup.groupId = groupId
    flightGroup.heliName = heliName
    flightGroup.pilotName = pilotName
    flightGroup.groupName = groupName
    flightGroup.pilotGroupName = pilotGroupName
    flightGroup.dropOffLocation = dropOffLocation
    self.heliName = heliName
    self.pilotName = pilotName
    self.groupName = groupName
    self.dropOffLocation = dropOffLocation

    DCSAR[groupName] = flightGroup

    

    return self
end

function DCSAR.SmokePickUp(heliName, pilotName)
    if pilotName ~= nil then
        local pilot = Unit.getByName(pilotName)

        if pilot ~= nil then
            Utils.sendMessageToUnits("Copy. Start Smoke at my Location", {heliName})

            trigger.action.smoke(pilot:getPoint(), smokeColor)
        else
            debugLog("pilot is missing: " .. pilotName)
        end
    else
        debugLog("pilot name missing")
    end
end

function DCSAR.SignalFlarePickup(heliName, pilotName)
    if pilotName ~= nil then
        local pilot = Unit.getByName(pilotName)

        if pilot ~= nil then
            Utils.sendMessageToUnits("Firing Signal Flare!", {heliName})

            trigger.action.signalFlare(pilot:getPoint(), 0, 0)
        else
            debugLog("pilot is missing")
        end
    else
        debugLog("pilot name missing")
    end
end

function DCSAR.PickUpPilot(groupName)
    local groupConfig = DCSAR[groupName]
    Utils.sendMessageToUnits("I'm in, lets GO!", {groupConfig.heliName})
    
    debugLog("Pilot " .. groupConfig.pilotName .. " picked up by " .. groupConfig.heliName)

    local pilot = Unit.getByName(groupConfig.pilotName)

    if pilot ~= nil then
        Group.destroy(pilot:getGroup())
    end


    trigger.action.setUnitInternalCargo(groupConfig.heliName, 80)

    groupConfig.pickedUp = timer.getTime()
    picked_up_pilots[#picked_up_pilots + 1] = groupConfig.pilotGroupName

    local path = groupConfig.menuRootPath
    local smokePath = path
    smokePath[#smokePath + 1] = "Request Smoke"
    local flarePath = path
    flarePath[#flarePath + 1] = "Request Signal Flare"
    local brPath = path
    brPath[#brPath + 1] = "Get Pick Up BR Call"

    missionCommands.removeItemForGroup(groupConfig.groupId, smokePath)
    missionCommands.removeItemForGroup(groupConfig.groupId, flarePath)
    missionCommands.removeItemForGroup(groupConfig.groupId, brPath)
end

function DCSAR.BRCallPickUp(heliName, pilotName)
    local unitTable = {}

    table.insert(unitTable, pilotName)

    local heli = Unit.getByName(heliName)

    local str = mist.getBRString({units = unitTable,  ref = heli:getPoint()})

    Utils.sendMessageToUnits(str, {heliName}, 10)
end

function DCSAR.GetDropOffBRCall(heliName, pilotName)
    local unitTable = {}

    table.insert(unitTable, pilotName)

    local heli = Unit.getByName(heliName)

    local str = mist.getBRString({units = unitTable,  ref = heli:getPoint()})

    Utils.sendMessageToUnits(str, {heliName})
end

function DCSAR.Tick(groupName)
    local groupConfig = DCSAR[groupName]

    local heli = Unit.getByName(groupConfig.heliName)
    local pilot = Unit.getByName(groupConfig.pilotName)

    if heli ~= nil and pilot ~= nil then
        local distanceToPilot = mist.getPathLength({heli:getPoint(), pilot:getPoint()})

        --Utils.sendMessageToUnits("Distance: " .. tostring(distanceToPilot), {groupConfig.heliName})

        if distanceToPilot <= notificationPickUpRange and groupConfig.notification == nil then
            Utils.sendMessageToUnits("I hear you! You must be close. Land or Hover at my Location to pick me up", {groupConfig.heliName})

            groupConfig.notification = timer.getTime()
        end

        if distanceToPilot <= hoverPickUpRange then
            local height = heli:getPoint().y - pilot:getPoint().y

            if height <= 20 then
                if groupConfig.hoverTimer then
                    if (timer.getTime() - groupConfig.hoverTimer) >= 5 then
                        debugLog("Picking up... d: " .. tostring(distanceToPilot))
                        DCSAR.PickUpPilot(groupName)
                    end
                else
                    Utils.sendMessageToUnits("Start Hovering", {groupConfig.heliName})
                    groupConfig.hoverTimer = timer.getTime()
                end
            else
                if groupConfig.hoverTimer then
                    Utils.sendMessageToUnits("Cancel Hovering", {groupConfig.heliName})
                    groupConfig.hoverTimer = nil
                end
            end
            
        else
            if groupConfig.hoverTimer then
                Utils.sendMessageToUnits("Cancel Hovering", {groupConfig.heliName})
                groupConfig.hoverTimer = nil
            end
        end
    end
end

function DCSAR.OnLand(groupName)
    local groupConfig = DCSAR[groupName]

    if groupConfig then
        local heli = Unit.getByName(groupConfig.heliName)
        

        if heli ~= nil then
            --trigger.action.outSoundForUnit(heli:getID(), "l10n/DEFAULT/drop-off.wav")

            -- local distanceToPilot = Utils:distanceToPosition(heli:getPoint(), pilot:getPoint())
            

            if groupConfig.pickedUp then
                local distanceToDropOff = mist.getPathLength({heli:getPoint(), groupConfig.dropOffLocation})

                if distanceToDropOff <= landedDropOffRange then
                    Utils.sendMessageToUnits("I'm out! Thanks for the Ride", {groupConfig.heliName})
                    trigger.action.setUnitInternalCargo(groupConfig.heliName, 0)
                    rescued_pilots[#rescued_pilots + 1] = groupConfig.pilotGroupName
                else
                    Utils.sendMessageToUnits("Out of Range for Drop Off", {groupConfig.heliName})
                end
            else
                local pilot = Unit.getByName(groupConfig.pilotName)

                if pilot then
                    local distanceToPilot = mist.getPathLength({heli:getPoint(), pilot:getPoint()})

                    if distanceToPilot <= landedPickUpRange then
                        debugLog("Picking up... d: " .. tostring(distanceToPilot))
        
                        DCSAR.PickUpPilot(groupName)
                    else
                        Utils.sendMessageToUnits("Out of Range for Pick Up", {groupConfig.heliName})
                        debugLog("Pilot " .. groupConfig.pilotName .. " is out of range of " .. groupConfig.heliName)
                    end
                end
            end
        else
            debugLog("heli or pilot is missing")
            debugLog("heli: " .. groupConfig.heliName)
            printObj(heli)
            debugLog("pilot: " .. groupConfig.pilotName)
            printObj(pilot)
        end
    else
        debugLog("group config not found for: " .. groupName)
    end
end

DCSAR.eventHandler = {}
function DCSAR:onEvent(event)
    if event.id == world.event.S_EVENT_BIRTH and event.initiator then
        if event.initiator == nil then
            debugLog("event.initiator is nil")
            return
        end

        local name = event.initiator:getName()
        local unit = Unit.getByName(name)

        if unit then
            local group = unit:getGroup()
            if group then
                local groupName = group:getName()

                local groupConfig = DCSAR[groupName]

                if groupConfig then
                    debugLog("id: " .. groupConfig.groupId)
                    debugLog("heliName: " .. groupConfig.heliName)
                    missionCommands.removeItemForGroup(groupConfig.groupId, "CSAR")
                    local rootPath = missionCommands.addSubMenuForGroup(groupConfig.groupId, "CSAR")

                    missionCommands.addCommandForGroup(groupConfig.groupId, "Request Smoke", rootPath, DCSAR.SmokePickUp, groupConfig.heliName, groupConfig.pilotName)
                    missionCommands.addCommandForGroup(groupConfig.groupId, "Request Signal Flare", rootPath, DCSAR.SignalFlarePickup, groupConfig.heliName, groupConfig.pilotName)
                    missionCommands.addCommandForGroup(groupConfig.groupId, "Get Pick Up BR Call", rootPath, DCSAR.BRCallPickUp, groupConfig.heliName, groupConfig.pilotName)
                end
            end
        end
    end
    if event.id == world.event.S_EVENT_LAND and event.initiator then
        if event.initiator == nil then
            debugLog("event.initiator is nil")
            return
        end
        local name = event.initiator:getName()
        local unit = Unit.getByName(name)

        if unit then
            local group = unit:getGroup()
            if group then
                local groupName = group:getName()
                
                debugLog("landed group name: " .. groupName)

                DCSAR.OnLand(groupName)
            else
                debugLog("on event, unit not found: " .. name)
            end
        end
    end
end

function DCSAR:Start()
    local unitTable = {}

    table.insert(unitTable, self.groupName)
    local csar = self

    self.schedule = mist.scheduleFunction(DCSAR.Tick, {self.groupName}, timer.getTime(), 1)
    --timer.scheduleFunction(DCSAR.Tick, self.groupName, timer.getTime() + 1)
    self.event = world.addEventHandler(DCSAR)
end

function DCSAR:Stop()
    if self.schedule ~= nil then
        mist.removeFunction(self.schedule)
        self.schedule = nil 
    end

    if self.event ~= nil then
        mist.removeEventHandler(self.event)
    end
end

